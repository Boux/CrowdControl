<script>
import { useHostStore } from "../../stores/host"
import SeatCard from "../../components/dashboard/SeatCard.vue"
import SessionQr from "../../components/dashboard/SessionQr.vue"

export default {
  name: "DashboardView",
  components: { SeatCard, SessionQr },
  data: () => ({
    newSeatId: null
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
  methods: {
    addSeat() {
      const n = this.seats.length + 1
      this.newSeatId = this.host.addSeat(`Seat ${n}`, "#3498db")
    },
    endSession() {
      this.host.disconnectRelay()
      this.$router.push("/")
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
      <SessionQr :url='sessionUrl' :code='session?.id' />
    </header>

    <div class='seats-section'>
      <div class='section-header'>
        <h2>Seats ({{ seats.length }})</h2>
        <button class='add' @click='addSeat'>+ Add Seat</button>
      </div>

      <div class='seats-grid'>
        <SeatCard v-for='seat in seats' :key='seat.id' :seat='seat' :auto-rename='seat.id === newSeatId' />
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

.seats-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))
  gap: 1rem

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
