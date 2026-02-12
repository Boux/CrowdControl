<script>
import { useHostStore } from "../../stores/host"
import SeatCanvas from "../../components/SeatCanvas.vue"
import QRCode from "qrcode"

export default {
  name: "DashboardView",
  components: { SeatCanvas },
  data: () => ({
    showAddSeat: false,
    newSeatName: "",
    newSeatColor: "#3498db",
    qrDataUrl: null
  }),
  computed: {
    host() { return useHostStore() },
    session() { return this.host.session },
    seats() { return this.host.seats },
    oscLogs() { return this.host.oscLogs },
    oscConfig() { return this.host.settings.osc },
    sessionUrl() {
      const base = this.host.settings.relay.url.replace(/\/$/, "")
      return `${base}/session/${this.session?.id}`
    }
  },
  watch: {
    sessionUrl: {
      immediate: true,
      handler(url) { this.generateQr(url) }
    }
  },
  methods: {
    async generateQr(url) {
      this.qrDataUrl = await QRCode.toDataURL(url, {
        width: 200,
        margin: 1,
        color: { dark: "#ffffff", light: "#00000000" }
      })
    },
    addSeat() {
      if (!this.newSeatName.trim()) return
      this.host.addSeat(this.newSeatName.trim(), this.newSeatColor)
      this.newSeatName = ""
      this.newSeatColor = "#3498db"
      this.showAddSeat = false
    },
    deleteSeat(seatId) {
      this.host.deleteSeat(seatId)
    },
    kickSeat(seatId) {
      this.host.kickSeat(seatId)
    },
    editSeat(seatId) {
      this.$router.push(`/seat/${seatId}/edit`)
    },
    copyCode() {
      navigator.clipboard.writeText(this.session.id)
    },
    endSession() {
      this.host.disconnectRelay()
      this.$router.push("/")
    },
    onControl(seat, control, value, valueY) {
      control.value = value
      if (valueY !== undefined) control.valueY = valueY
      const args = valueY !== undefined ? [value, valueY] : [value]
      this.host.sendOsc(control.oscAddress, args)
      this.host.sendControlMidi(control, value, valueY)
      this.host.sendControlChange(seat.id, control.id, value, valueY)
    }
  }
}
</script>

<template>
  <div class='dashboard'>
    <header>
      <button class='end' @click='endSession'>&larr; End Session</button>
      <div>
        <h1>{{ session?.name }}</h1>
        <p class='osc'>
          OSC: {{ oscConfig.host }}:{{ oscConfig.port }} ({{ oscConfig.protocol }})
          <template v-if='host.midiConnected'>
            &middot; MIDI: {{ host.settings.midi.device }}
          </template>
          <router-link to='/settings' class='settings-hint'>settings</router-link>
        </p>
      </div>
      <div class='share'>
        <img v-if='qrDataUrl' :src='qrDataUrl' class='qr' />
        <div class='share-info'>
          <div class='code-row'>
            <input type='text' :value='session?.id' readonly />
            <button @click='copyCode'>Copy</button>
          </div>
          <div class='session-url'>{{ sessionUrl }}</div>
        </div>
      </div>
    </header>

    <div class='seats-section'>
      <div class='section-header'>
        <h2>Seats ({{ seats.length }})</h2>
        <button class='add' @click='showAddSeat = true'>+ Add Seat</button>
      </div>

      <div v-if='showAddSeat' class='add-form'>
        <input v-model='newSeatName' type='text' placeholder='Seat name' @keyup.enter='addSeat' />
        <input v-model='newSeatColor' type='color' />
        <button @click='addSeat'>Add</button>
        <button class='cancel' @click='showAddSeat = false'>Cancel</button>
      </div>

      <div class='seats-grid'>
        <div v-for='seat in seats' :key='seat.id' class='seat-card' :style='{ borderColor: seat.color }'>
          <div class='seat-header' :style='{ background: seat.color + "22" }'>
            <div class='color' :style='{ background: seat.color }'></div>
            <div class='info'>
              <span class='name'>{{ seat.name }}</span>
              <span class='status' :class='{ occupied: seat.occupiedBy }'>
                {{ seat.occupiedBy ? "In use" : "Available" }}
              </span>
            </div>
          </div>

          <div class='seat-controls'>
            <SeatCanvas
              v-if='seat.controls.length'
              :controls='seat.controls'
              @control='(c, v, vy) => onControl(seat, c, v, vy)'
            />
            <span v-else class='empty'>No controls</span>
          </div>

          <div class='seat-actions'>
            <button v-if='seat.occupiedBy' class='kick' @click='kickSeat(seat.id)'>Kick</button>
            <button @click='editSeat(seat.id)'>Edit</button>
            <button class='delete' @click='deleteSeat(seat.id)'>Delete</button>
          </div>
        </div>
      </div>
    </div>

    <div class='osc-section'>
      <h2>OSC Log</h2>
      <div class='osc-log'>
        <div v-for='(log, i) in oscLogs' :key='i' class='log'>
          <span class='address'>{{ log.address }}</span>
          <span class='args'>{{ log.args }}</span>
        </div>
        <span v-if='!oscLogs.length' class='empty'>No messages yet</span>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.dashboard
  padding: 1.5rem

header
  display: flex
  align-items: flex-start
  gap: 1rem
  margin-bottom: 2rem

  h1
    font-size: 1.5rem
    margin: 0

.end
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  cursor: pointer
  white-space: nowrap
  margin-top: 0.25rem

  &:hover
    border-color: #e74c3c
    color: #e74c3c

.osc
  font-size: 0.75rem
  color: #666

  .settings-hint
    margin-left: 0.5rem
    color: #444
    font-size: 0.625rem
    text-decoration: none

    &:hover
      color: #4a9eff

.share
  margin-left: auto
  display: flex
  align-items: center
  gap: 0.75rem

.qr
  width: 80px
  height: 80px

.share-info
  display: flex
  flex-direction: column
  gap: 0.25rem

.session-url
  font-size: 0.625rem
  color: #555
  word-break: break-all

.code-row
  display: flex
  gap: 0.5rem

  input
    width: 120px
    padding: 0.5rem
    border: 1px solid #333
    border-radius: 6px
    background: #1a1a2e
    color: white
    font-family: monospace
    font-size: 0.8rem

  button
    padding: 0.5rem 0.75rem
    background: #333
    border: none
    border-radius: 6px
    color: white
    cursor: pointer
    font-size: 0.75rem

.section-header
  display: flex
  justify-content: space-between
  align-items: center
  margin-bottom: 1rem

  h2
    font-size: 1.25rem
    margin: 0

.add
  padding: 0.5rem 1rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  border: none
  border-radius: 6px
  color: white
  cursor: pointer

.add-form
  display: flex
  gap: 0.5rem
  padding: 1rem
  background: #1a1a2e
  border-radius: 8px
  margin-bottom: 1rem

  input[type='text']
    flex: 1
    padding: 0.5rem
    border: 1px solid #333
    border-radius: 4px
    background: #0d0d1a
    color: white

  input[type='color']
    width: 40px
    border: none
    cursor: pointer

  button
    padding: 0.5rem 1rem
    border: none
    border-radius: 4px
    cursor: pointer
    background: #4a9eff
    color: white

    &.cancel
      background: #333

.seats-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))
  gap: 1rem

.seat-card
  display: flex
  flex-direction: column
  background: #0d0d1a
  border: 2px solid
  border-radius: 10px
  overflow: hidden

.seat-header
  display: flex
  align-items: center
  gap: 0.75rem
  padding: 0.75rem

.color
  width: 24px
  height: 24px
  border-radius: 6px
  flex-shrink: 0

.info
  flex: 1
  display: flex
  flex-direction: column
  min-width: 0

  .name
    font-weight: 600
    font-size: 0.9rem
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis

  .status
    font-size: 0.675rem
    color: #666

    &.occupied
      color: #4a9eff

.seat-controls
  aspect-ratio: 9 / 19.5
  padding: 0.5rem 0.75rem

  .empty
    text-align: center
    color: #444
    font-size: 0.75rem
    padding: 1.5rem 0

.seat-actions
  display: flex
  gap: 0.5rem
  padding: 0.5rem 0.75rem 0.75rem
  border-top: 1px solid #1a1a2e

  button
    flex: 1
    padding: 0.4rem
    background: #1a1a2e
    border: none
    border-radius: 4px
    color: #888
    font-size: 0.7rem
    cursor: pointer

    &:hover
      color: white
      background: #252542

    &.kick
      color: #e67e22

      &:hover
        background: #e67e22
        color: white

    &.delete
      color: #e74c3c

      &:hover
        background: #e74c3c
        color: white

.empty
  color: #666
  font-size: 0.875rem

.osc-section
  margin-top: 2rem

  h2
    font-size: 1.25rem
    margin-bottom: 1rem

.osc-log
  background: #0d0d1a
  border-radius: 8px
  padding: 1rem
  max-height: 150px
  overflow-y: auto
  font-family: monospace
  font-size: 0.8rem

.log
  display: flex
  gap: 1rem
  padding: 0.25rem 0
  border-bottom: 1px solid #1a1a2e

  .address
    color: #4a9eff

  .args
    color: #888
</style>
