import { defineStore } from "pinia"
import { useRelayStore } from "./relay"

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
      console.log("client:join response, seats:", response.session?.seats?.length)
      this.session = response.session
      this.setupListeners()
      return response.session
    },

    async takeSeat(seatId) {
      const relay = useRelayStore()
      const response = await relay.emit("client:takeSeat", { sessionId: this.session.id, seatId })
      this.currentSeat = response.seat
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

    sendControl(controlId, value, valueY) {
      const relay = useRelayStore()
      relay.emitNoAck("control:change", {
        sessionId: this.session.id,
        seatId: this.currentSeat.id,
        controlId,
        value,
        valueY
      })

      // Optimistic local update - replace the control to ensure reactivity
      const idx = this.currentSeat?.controls?.findIndex(c => c.id === controlId)
      if (idx === -1 || idx === undefined) return
      const control = this.currentSeat.controls[idx]
      this.currentSeat.controls[idx] = { ...control, value, ...(valueY !== undefined && { valueY }) }
    },

    setupListeners() {
      const relay = useRelayStore()

      relay.on("session:updated", ({ session }) => {
        console.log("session:updated received, seats:", session.seats?.length)
        this.session = session
        if (!this.currentSeat) return
        this.currentSeat = session.seats.find(s => s.id === this.currentSeat.id) || null
      })

      relay.on("control:change", ({ seatId, controlId, value, valueY }) => {
        if (!this.currentSeat || this.currentSeat.id !== seatId) return
        const idx = this.currentSeat.controls.findIndex(c => c.id === controlId)
        if (idx === -1) return
        const control = this.currentSeat.controls[idx]
        this.currentSeat.controls[idx] = { ...control, value, ...(valueY !== undefined && { valueY }) }
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
