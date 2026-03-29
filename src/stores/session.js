import { defineStore } from "pinia"
import { useRelayStore } from "./relay"
import { hydrateSeats } from "../models/index"
import Control from "../models/Control"

export const useSessionStore = defineStore("session", {
  state: () => ({
    session: null,
    currentSeat: null,
    error: null
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
      if (!this._pendingControls) this._pendingControls = {}
      this._pendingControls[control.id] = control.toWire()

      if (!this._sendTimer) {
        this._sendTimer = setTimeout(() => {
          const relay = useRelayStore()
          const changes = Object.values(this._pendingControls)
          relay.emitNoAck("control:batch", { seatId: this.currentSeat.id, changes })
          this._pendingControls = {}
          this._sendTimer = null
        }, 50)
      }
    },

    setupListeners() {
      const relay = useRelayStore()

      relay.on("session:updated", ({ session }) => {
        this.session = session
        hydrateSeats(this.session.seats)
        if (!this.currentSeat) return
        this.currentSeat = session.seats.find(s => s.id === this.currentSeat.id) || null
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
    },

    startHeartbeat() {
      this.heartbeatInterval = setInterval(() => {
        const relay = useRelayStore()
        relay.emitNoAck("client:heartbeat", { sessionId: this.session.id })
      }, 2000)
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
