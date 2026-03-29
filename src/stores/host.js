import { defineStore } from "pinia"
import { nanoid } from "nanoid"
import { nameToSlug, collectUsedMidi, collectUsedAddresses, assignMidi, nextAddress } from "../utils/control.js"
import { createControl, hydrateSeats } from "../models/index.js"
import Control from "../models/Control.js"

const api = window.electronAPI

const defaultSettings = {
  osc: { enabled: true, host: "127.0.0.1", port: 9000, protocol: "udp" },
  relay: { url: "https://crowdcontrol-production.up.railway.app", servers: ["https://crowdcontrol-production.up.railway.app"] },
  midi: { enabled: false, device: "" }
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
    live: false,
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
    // Settings
    saveSettings(settings) {
      this.settings = settings
      localStorage.setItem("crowdosc:settings", JSON.stringify(settings))
      if (settings.osc.enabled && this.oscConnected) this.connectOsc()
      if (settings.midi.enabled && settings.midi.device) this.connectMidi()
      else this.disconnectMidi()
    },

    // Relay
    async connectRelay(url) {
      const result = await api.relay.connect(url)
      this.connected = result.success
      this.setupListeners()
      return result
    },

    disconnectRelay() {
      api.relay.disconnect()
      this.connected = false
      this.live = false
      this.session = null
      localStorage.removeItem("crowdosc:active")
    },

    async goLive() {
      const url = this.settings.relay.url
      const relayResult = await this.connectRelay(url)
      if (!relayResult.success) return relayResult

      const result = await api.session.create({ id: this.session.id, name: this.session.name })
      if (!result.success) return result

      const seats = JSON.parse(JSON.stringify(this.session.seats))
      api.session.update({ seats })
      this.live = true
      return { success: true }
    },

    goOffline() {
      api.session.close()
      api.relay.disconnect()
      this.connected = false
      this.live = false
    },

    // Session
    createSession(name) {
      this.session = { id: nanoid(8), name, seats: [] }
      this.saveActiveSession()
      this.saveToRecent()
    },

    // Seats
    addSeat(name, color) {
      if (!this.session) return
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

      const usedAddresses = collectUsedAddresses(this.session.seats)
      const usedMidi = collectUsedMidi(this.session.seats)
      const oldSlug = nameToSlug(seat.name)
      const newSlug = nameToSlug(copy.name)

      copy.controls = copy.controls.map(c => {
        const ctrl = createControl(c)
        ctrl.id = nanoid(8)
        if (ctrl.oscAddress && oldSlug && newSlug && ctrl.oscAddress.startsWith("/" + oldSlug + "/"))
          ctrl.oscAddress = "/" + newSlug + ctrl.oscAddress.slice(oldSlug.length + 1)
        if (ctrl.oscAddress) ctrl.oscAddress = nextAddress(ctrl.oscAddress, usedAddresses)
        assignMidi(ctrl, usedMidi)
        return ctrl
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
      if (this.live) api.session.kick({ seatId })
      const seat = this.session.seats.find(s => s.id === seatId)
      if (seat) seat.occupiedBy = null
    },

    // Controls
    addControl(seatId, control) {
      const seat = this.session.seats.find(s => s.id === seatId)
      if (!seat) return
      control.id = nanoid(8)
      seat.controls.push(control)
      this.syncSession()
      return control.id
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

    // Persistence
    syncSession() {
      this.saveActiveSession()
      this.saveToRecent()
      if (this.live) {
        const seats = JSON.parse(JSON.stringify(this.session.seats))
        api.session.update({ seats })
      }
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
        if (!raw) return null
        const saved = JSON.parse(raw)
        if (saved?.seats) hydrateSeats(saved.seats)
        return saved
      } catch { return null }
    },

    saveToRecent() {
      if (!this.session) return
      const recent = this.getRecent()
      const snapshot = {
        name: this.session.name,
        seats: this.session.seats.map(s => ({
          id: s.id, name: s.name, color: s.color,
          controls: s.controls.map(c => { const j = c.toJSON(); delete j.values; return j })
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
      try { return JSON.parse(localStorage.getItem("crowdosc:recent")) || [] }
      catch { return [] }
    },

    deleteRecent(index) {
      const recent = this.getRecent()
      recent.splice(index, 1)
      localStorage.setItem("crowdosc:recent", JSON.stringify(recent))
    },

    // Output
    sendControlOutput(control) {
      if (this.settings.osc.enabled && this.oscConnected) {
        const args = control.getOSCArgs()
        api.osc.send(control.oscAddress, args)
        this.oscLogs.unshift({ address: control.oscAddress, args: args.map(v => v.toFixed(2)).join(", "), time: Date.now() })
        if (this.oscLogs.length > 50) this.oscLogs.pop()
      }
      if (this.settings.midi.enabled && this.midiConnected)
        for (const { ch, cc, value } of control.getAllCCValues())
          api.midi.send(ch, cc, Math.round(value * 127))
    },

    sendControlChange(seatId, control) {
      if (!this.live) return
      if (!this._pendingHostControls) this._pendingHostControls = {}
      if (!this._pendingHostControls[seatId]) this._pendingHostControls[seatId] = {}
      this._pendingHostControls[seatId][control.id] = control.toWire()

      if (!this._hostRafId) {
        this._hostRafId = requestAnimationFrame(() => {
          for (const [sid, controls] of Object.entries(this._pendingHostControls))
            api.session.controlBatch({ seatId: sid, changes: Object.values(controls) })
          this._pendingHostControls = {}
          this._hostRafId = null
        })
      }
    },

    // Connections
    async connectOsc() {
      if (!this.settings.osc.enabled) return { success: false }
      const result = await api.osc.connect({ ...this.settings.osc })
      this.oscConnected = result.success
      return result
    },

    async getMidiOutputs() {
      if (!api?.midi) return []
      return api.midi.getOutputs()
    },

    async connectMidi() {
      if (!api?.midi || !this.settings.midi.enabled) return { success: false }
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

    // Relay listeners
    setupListeners() {
      api.relay.onEvent(({ event, data }) => {
        if (event === "control:batch") this.handleControlBatch(data)
        if (event === "seat:taken") this.handleSeatTaken(data)
        if (event === "seat:released") this.handleSeatReleased(data)
      })
    },

    handleControlBatch(data) {
      const seat = this.session.seats.find(s => s.id === data.seatId)
      if (!seat) return
      for (const wire of data.changes) {
        const control = seat.controls.find(c => c.id === wire[0])
        if (!control) continue
        Control.fromWire(wire, control, () => this.sendControlOutput(control))
        if (!wire[2]) this.sendControlOutput(control)
      }
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
