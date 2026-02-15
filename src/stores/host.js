import { defineStore } from "pinia"
import { nanoid } from "nanoid"

const api = window.electronAPI

function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

const defaultSettings = {
  osc: { host: "127.0.0.1", port: 9000, protocol: "udp" },
  relay: { url: api?.isDev === false ? "https://localhost:3001" : "https://localhost:5173" },
  midi: { device: "" }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem("crowdosc:settings")
    if (!raw) return JSON.parse(JSON.stringify(defaultSettings))
    const saved = JSON.parse(raw)
    return {
      osc: { ...defaultSettings.osc, ...saved.osc },
      relay: { ...defaultSettings.relay, ...saved.relay },
      midi: { ...defaultSettings.midi, ...saved.midi }
    }
  } catch { return JSON.parse(JSON.stringify(defaultSettings)) }
}

export const useHostStore = defineStore("host", {
  state: () => ({
    connected: false,
    session: null,
    oscConnected: false,
    midiConnected: false,
    oscLogs: [],
    settings: loadSettings()
  }),

  getters: {
    seats: (state) => state.session?.seats || []
  },

  actions: {
    saveSettings(settings) {
      this.settings = settings
      localStorage.setItem("crowdosc:settings", JSON.stringify(settings))
      if (this.oscConnected) this.connectOsc()
      if (settings.midi.device) this.connectMidi()
      else this.disconnectMidi()
    },

    async connectRelay(url) {
      const result = await api.relay.connect(url)
      this.connected = result.success
      this.setupListeners()
      return result
    },

    disconnectRelay() {
      api.relay.disconnect()
      this.connected = false
      this.session = null
      localStorage.removeItem("crowdosc:active")
    },

    async createSession(name, id) {
      const payload = { name }
      if (id) payload.id = id
      const result = await api.session.create(payload)
      console.log("createSession result:", result)
      if (result.success) {
        this.session = result.session
        this.saveActiveSession()
        this.saveToRecent()
      }
      return result
    },

    addSeat(name, color) {
      if (!this.session) return console.error("addSeat: no session")
      const seat = { id: nanoid(8), name, color, controls: [], occupiedBy: null, aspectW: 9, aspectH: 19.5 }
      this.session.seats.push(seat)
      this.syncSession()
      return seat.id
    },

    updateSeat(seatId, data) {
      const seat = this.session.seats.find(s => s.id === seatId)
      if (!seat) return
      if (data.name && data.name !== seat.name) {
        const oldSlug = nameToSlug(seat.name)
        const newSlug = nameToSlug(data.name)
        if (oldSlug && newSlug && oldSlug !== newSlug)
          for (const c of seat.controls)
            if (c.oscAddress?.startsWith("/" + oldSlug + "/"))
              c.oscAddress = "/" + newSlug + c.oscAddress.slice(oldSlug.length + 1)
      }
      Object.assign(seat, data)
      this.syncSession()
    },

    duplicateSeat(seatId) {
      const seat = this.session.seats.find(s => s.id === seatId)
      if (!seat) return
      const copy = JSON.parse(JSON.stringify(seat))
      copy.id = nanoid(8)
      copy.name = seat.name + " (copy)"
      copy.occupiedBy = null

      const usedAddresses = new Set()
      const usedMidi = new Set()
      for (const s of this.session.seats)
        for (const c of s.controls) {
          if (c.oscAddress) usedAddresses.add(c.oscAddress)
          if (c.midiCC !== undefined) usedMidi.add(`${c.midiChannel || 0}:${c.midiCC}`)
          if (c.midiCCY !== undefined) usedMidi.add(`${c.midiChannel || 0}:${c.midiCCY}`)
        }

      const nextMidi = () => {
        for (let ch = 0; ch < 16; ch++)
          for (let cc = 0; cc < 128; cc++)
            if (!usedMidi.has(`${ch}:${cc}`)) { usedMidi.add(`${ch}:${cc}`); return { ch, cc } }
        return { ch: 0, cc: 0 }
      }

      const nextAddress = (base) => {
        if (!usedAddresses.has(base)) { usedAddresses.add(base); return base }
        for (let n = 2; ; n++) {
          const addr = base.replace(/\d*$/, "") + n
          if (!usedAddresses.has(addr)) { usedAddresses.add(addr); return addr }
        }
      }

      const oldSlug = nameToSlug(seat.name)
      const newSlug = nameToSlug(copy.name)

      copy.controls.forEach(c => {
        c.id = nanoid(8)
        if (c.oscAddress && oldSlug && newSlug && c.oscAddress.startsWith("/" + oldSlug + "/"))
          c.oscAddress = "/" + newSlug + c.oscAddress.slice(oldSlug.length + 1)
        if (c.oscAddress) c.oscAddress = nextAddress(c.oscAddress)
        if (c.midiCC !== undefined) {
          const slot = nextMidi()
          c.midiChannel = slot.ch
          c.midiCC = slot.cc
        }
        if (c.midiCCY !== undefined) {
          const slot = nextMidi()
          c.midiCCY = slot.cc
          if (c.midiChannel !== slot.ch) c.midiChannel = slot.ch
        }
      })

      this.session.seats.push(copy)
      this.syncSession()
      return copy.id
    },

    deleteSeat(seatId) {
      this.session.seats = this.session.seats.filter(s => s.id !== seatId)
      this.syncSession()
    },

    kickSeat(seatId) {
      api.session.kick({ seatId })
      const seat = this.session.seats.find(s => s.id === seatId)
      if (seat) seat.occupiedBy = null
    },

    addControl(seatId, control) {
      const seat = this.session.seats.find(s => s.id === seatId)
      if (!seat) return
      const id = nanoid(8)
      seat.controls.push({ id, ...control })
      this.syncSession()
      return id
    },

    updateControl(seatId, controlId, data) {
      const seat = this.session.seats.find(s => s.id === seatId)
      const control = seat?.controls?.find(c => c.id === controlId)
      if (!control) return
      Object.assign(control, data)
      this.syncSession()
    },

    deleteControl(seatId, controlId) {
      const seat = this.session.seats.find(s => s.id === seatId)
      if (!seat) return
      seat.controls = seat.controls.filter(c => c.id !== controlId)
      this.syncSession()
    },

    syncSession() {
      const seats = JSON.parse(JSON.stringify(this.session.seats))
      api.session.update({ seats })
      this.saveActiveSession()
      this.saveToRecent()
    },

    saveActiveSession() {
      if (!this.session) return
      localStorage.setItem("crowdosc:active", JSON.stringify({
        id: this.session.id,
        name: this.session.name,
        seats: this.session.seats
      }))
    },

    loadActiveSession() {
      try {
        const raw = localStorage.getItem("crowdosc:active")
        return raw ? JSON.parse(raw) : null
      } catch { return null }
    },

    saveToRecent() {
      if (!this.session) return
      const recent = this.getRecent()
      const snapshot = {
        name: this.session.name,
        seats: this.session.seats.map(s => ({
          id: s.id, name: s.name, color: s.color,
          controls: s.controls.map(c => ({ ...c, value: undefined, valueY: undefined }))
        })),
        savedAt: Date.now()
      }
      const idx = recent.findIndex(r => r.name === snapshot.name)
      if (idx !== -1) recent.splice(idx, 1)
      recent.unshift(snapshot)
      if (recent.length > 10) recent.length = 10
      localStorage.setItem("crowdosc:recent", JSON.stringify(recent))
    },

    getRecent() {
      try {
        return JSON.parse(localStorage.getItem("crowdosc:recent")) || []
      } catch { return [] }
    },

    deleteRecent(index) {
      const recent = this.getRecent()
      recent.splice(index, 1)
      localStorage.setItem("crowdosc:recent", JSON.stringify(recent))
    },

    async connectOsc() {
      const config = { ...this.settings.osc }
      const result = await api.osc.connect(config)
      this.oscConnected = result.success
      return result
    },

    sendControlChange(seatId, controlId, value, valueY) {
      api.session.controlChange({ seatId, controlId, value, valueY })
    },

    sendOsc(address, args) {
      api.osc.send(address, args)
      this.oscLogs.unshift({ address, args: args.map(v => v.toFixed(2)).join(", "), time: Date.now() })
      if (this.oscLogs.length > 50) this.oscLogs.pop()
    },

    async getMidiOutputs() {
      if (!api?.midi) return []
      return api.midi.getOutputs()
    },

    async connectMidi() {
      if (!api?.midi) return { success: false }
      const device = this.settings.midi.device
      if (!device) return { success: false }
      const result = await api.midi.connect(device)
      this.midiConnected = result.success
      return result
    },

    disconnectMidi() {
      if (!api?.midi) return
      api.midi.disconnect()
      this.midiConnected = false
    },

    sendMidi(channel, controller, value) {
      if (!api?.midi) return
      api.midi.send(channel, controller, value)
    },

    sendControlMidi(control, value, valueY) {
      if (!this.midiConnected || control.midiCC === undefined) return
      const ch = control.midiChannel || 0
      const toMidi = (v) => Math.round(v * 127)
      if (control.type === "button" || control.type === "toggle") {
        this.sendMidi(ch, control.midiCC, value > 0 ? 127 : 0)
        return
      }
      const min = control.min ?? 0
      const max = control.max ?? 1
      const norm = (value - min) / (max - min)
      this.sendMidi(ch, control.midiCC, toMidi(norm))
      if (control.midiCCY !== undefined && valueY !== undefined) {
        const normY = (valueY - min) / (max - min)
        this.sendMidi(ch, control.midiCCY, toMidi(normY))
      }
    },

    setupListeners() {
      api.relay.onEvent(({ event, data }) => {
        if (event === "control:change") this.handleControlChange(data)
        if (event === "seat:taken") this.handleSeatTaken(data)
        if (event === "seat:released") this.handleSeatReleased(data)
      })
    },

    handleControlChange(data) {
      const seat = this.session.seats.find(s => s.id === data.seatId)
      const control = seat?.controls?.find(c => c.id === data.controlId)
      if (!control) return

      control.value = data.value
      if (data.valueY !== undefined) control.valueY = data.valueY

      const args = data.valueY !== undefined ? [data.value, data.valueY] : [data.value]
      this.sendOsc(control.oscAddress, args)
      this.sendControlMidi(control, data.value, data.valueY)
    },

    handleSeatTaken(data) {
      const seat = this.session.seats.find(s => s.id === data.seatId)
      if (seat) seat.occupiedBy = data.socketId
    },

    handleSeatReleased(data) {
      const seat = this.session.seats.find(s => s.id === data.seatId)
      if (seat) seat.occupiedBy = null
    }
  }
})
