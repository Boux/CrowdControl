import { defineStore } from "pinia"
import { useRelayStore } from "./relay"
import { hydrateSeats } from "../models/index"
import Control from "../models/Control"
import { CONTROL_POLL_RATE, DEFAULT_INTERP, HEARTBEAT_INTERVAL } from "../constants"

export const useSessionStore = defineStore("session", {
  state: () => ({
    session: null,
    currentSeat: null,
    error: null,
    _reconnecting: false
  }),

  getters: {
    seats: (state) => state.session?.seats || [],
    availableSeats: (state) => state.session?.seats?.filter(s => !s.occupiedBy) || [],
    controls: (state) => state.currentSeat?.controls || []
  },

  actions: {
    async join(sessionId) {
      const relay = useRelayStore()
      const response = await relay.emit("client:join", { sessionId })
      this.session = response.session
      hydrateSeats(this.session.seats)
      this.setupListeners()
      sessionStorage.setItem("crowdosc:lastSession", JSON.stringify({ id: sessionId, name: response.session.name, time: Date.now() }))
      return response.session
    },

    async takeSeat(seatId) {
      const relay = useRelayStore()
      const response = await relay.emit("client:takeSeat", { sessionId: this.session.id, seatId })
      this.currentSeat = this.session.seats.find(s => s.id === seatId)
      this.startHeartbeat()
      return response.seat
    },

    releaseSeat() {
      if (!this.currentSeat) return
      const relay = useRelayStore()
      relay.emitNoAck("client:releaseSeat", { sessionId: this.session.id, seatId: this.currentSeat.id })
      this.stopHeartbeat()
      this.currentSeat = null
    },

    sendControl(control) {
      // setValues already called by SeatCanvas — just batch for network
      if (!this._pendingChanges) this._pendingChanges = []
      this._pendingChanges.push(control.toWire(DEFAULT_INTERP))

      if (!this._sendTimer) {
        this._sendTimer = setTimeout(() => {
          const relay = useRelayStore()
          relay.emitNoAck("control:batch", { seatId: this.currentSeat.id, changes: this._pendingChanges })
          this._pendingChanges = []
          this._sendTimer = null
        }, CONTROL_POLL_RATE)
      }
    },

    setupListeners() {
      const relay = useRelayStore()

      relay.on("session:updated", ({ session }) => {
        this.session = session
        hydrateSeats(this.session.seats)
        if (!this.currentSeat) return
        const found = session.seats.find(s => s.id === this.currentSeat.id)
        if (found) this.currentSeat = found
        else if (!this._reconnecting) this.currentSeat = null
      })

      relay.on("control:batch", ({ seatId, changes }) => {
        if (!this.currentSeat || this.currentSeat.id !== seatId) return
        for (const wire of changes) {
          const control = this.currentSeat.controls.find(c => c.id === wire[0])
          if (control) Control.fromWire(wire, control)
        }
      })

      relay.on("session:closed", () => {
        this.session = null
        this.currentSeat = null
      })

      relay.on("seat:kicked", () => {
        this.stopHeartbeat()
        this.currentSeat = null
      })

      relay.on("connect", async () => {
        if (!this.session) return
        this._reconnecting = true
        try {
          await relay.emit("client:join", { sessionId: this.session.id })
          if (this.currentSeat) {
            const result = await relay.emit("client:takeSeat", { sessionId: this.session.id, seatId: this.currentSeat.id })
            if (!result.success) this.currentSeat = null
          }
        } catch {
          this.session = null
          this.currentSeat = null
        }
        this._reconnecting = false
      })
    },

    startHeartbeat() {
      this.heartbeatInterval = setInterval(() => {
        const relay = useRelayStore()
        relay.emitNoAck("client:heartbeat", { sessionId: this.session.id })
      }, HEARTBEAT_INTERVAL)
    },

    stopHeartbeat() {
      if (this.heartbeatInterval) clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    },

    clear() {
      this.stopHeartbeat()
      this.session = null
      this.currentSeat = null
      this.error = null
    }
  }
})
