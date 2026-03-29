<script>
import { useHostStore } from "../../stores/host"
import { hydrateSeats } from "../../models/index"
import SeatCard from "../../components/dashboard/SeatCard.vue"
import SessionQr from "../../components/dashboard/SessionQr.vue"

export default {
  name: "DashboardView",
  components: { SeatCard, SessionQr },
  data: () => ({
    newSeatId: null,
    goingLive: false,
    menuOpen: false,
    logOpen: false
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
  created() {
    this._onClickOutside = (e) => {
      if (this.menuOpen && this.$refs.menuWrap && !this.$refs.menuWrap.contains(e.target))
        this.menuOpen = false
    }
    document.addEventListener("mousedown", this._onClickOutside)
  },
  beforeUnmount() {
    document.removeEventListener("mousedown", this._onClickOutside)
  },
  async mounted() {
    if (!this.session) {
      const saved = this.host.loadActiveSession()
      if (!saved) return this.$router.push("/")
      this.host.session = { id: saved.id, name: saved.name, seats: saved.seats }
    }
    if (!this.host.oscConnected) await this.host.connectOsc()
    if (!this.host.midiConnected) await this.host.connectMidi()
  },
  methods: {
    addSeat() {
      const n = this.seats.length + 1
      this.newSeatId = this.host.addSeat(`Seat ${n}`, "#3498db")
    },
    exportSession() {
      const data = {
        name: this.session.name,
        seats: this.seats.map(s => ({
          id: s.id, name: s.name, color: s.color,
          aspectW: s.aspectW, aspectH: s.aspectH,
          controls: s.controls.map(c => { const j = c.toJSON(); delete j.values; return j })
        }))
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const a = document.createElement("a")
      a.href = URL.createObjectURL(blob)
      a.download = `${this.session.name.replace(/[^a-z0-9]+/gi, "_")}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    },
    importSession() {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".json"
      input.onchange = () => {
        const file = input.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => {
          const data = JSON.parse(reader.result)
          if (!data.seats) return alert("Invalid session file")
          hydrateSeats(data.seats)
          this.host.session.seats = data.seats
          this.host.syncSession()
        }
        reader.readAsText(file)
      }
      input.click()
    },
    resendAll() {
      this.menuOpen = false
      for (const seat of this.seats)
        for (const c of seat.controls)
          this.host.sendControlOutput(c)
    },
    async goLive() {
      this.goingLive = true
      const result = await this.host.goLive()
      this.goingLive = false
      if (!result.success) alert("Failed to connect: " + (result.error || "Unknown error"))
    },
    goOffline() {
      this.host.goOffline()
    },
    endSession() {
      if (this.host.live) this.host.goOffline()
      this.host.disconnectRelay()
      this.$router.push("/")
    }
  }
}
</script>

<template>
  <div class='dashboard'>
    <div class='main'>
      <header>
        <IconButton icon='arrow-left' class='end' @click='endSession'>End Session</IconButton>
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
        <SessionQr v-if='host.live' :url='sessionUrl' :code='session?.id' />
        <IconButton v-if='host.live' icon='wifi-off' class='offline-btn' @click='goOffline'>Go Offline</IconButton>
        <IconButton v-else icon='wifi' class='live-btn' @click='goLive' :disabled='goingLive'>
          {{ goingLive ? "Connecting..." : "Go Live" }}
        </IconButton>
      </header>

      <div class='seats-section'>
        <div class='section-header'>
          <h2>Seats ({{ seats.length }})</h2>
          <div class='section-actions'>
            <IconButton icon='plus' class='add' @click='addSeat'>Add Seat</IconButton>
            <div class='menu-wrap' ref='menuWrap'>
              <IconButton icon='ellipsis-vertical' class='menu-btn' @click='menuOpen = !menuOpen' />
              <div v-if='menuOpen' class='menu-dropdown'>
                <IconButton icon='download' @click='importSession(); menuOpen = false'>Import</IconButton>
                <IconButton icon='upload' @click='exportSession(); menuOpen = false'>Export</IconButton>
                <IconButton icon='send' @click='resendAll'>Resend All OSC/MIDI</IconButton>
              </div>
            </div>
          </div>
        </div>

        <div class='seats-grid'>
          <SeatCard v-for='seat in seats' :key='seat.id' :seat='seat' :auto-rename='seat.id === newSeatId' @duplicate='id => newSeatId = id' />
        </div>
      </div>
    </div>

    <div class='osc-bar'>
      <div v-if='logOpen' class='osc-log'>
        <div v-for='(log, i) in oscLogs' :key='i' class='log'>
          <span class='address'>{{ log.address }}</span>
          <span class='args'>{{ log.args }}</span>
        </div>
        <span v-if='!oscLogs.length' class='empty'>No messages yet</span>
      </div>
      <div class='osc-header' @click='logOpen = !logOpen'>
        <span>OSC Log ({{ oscLogs.length }})</span>
        <Icon :name='logOpen ? "chevron-down" : "chevron-up"' :size='14' />
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.dashboard
  height: 100vh
  display: flex
  flex-direction: column

.main
  flex: 1
  overflow-y: auto
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

.live-btn
  padding: 0.5rem 1rem
  background: linear-gradient(135deg, #2ecc71, #27ae60)
  border: none
  border-radius: 6px
  color: white
  cursor: pointer
  white-space: nowrap
  margin-top: 0.25rem

  &:disabled
    opacity: 0.5

.offline-btn
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  border-radius: 6px
  color: #888
  cursor: pointer
  white-space: nowrap
  margin-top: 0.25rem

  &:hover
    border-color: #e67e22
    color: #e67e22

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

.section-actions
  display: flex
  gap: 0.5rem

.menu-wrap
  position: relative

.menu-btn
  padding: 0.5rem 0.75rem
  background: transparent
  border: 1px solid #333
  border-radius: 6px
  color: #888
  cursor: pointer
  font-size: 1.1rem
  line-height: 1

  &:hover
    border-color: #4a9eff
    color: #4a9eff

.menu-dropdown
  position: absolute
  right: 0
  top: 100%
  margin-top: 0.25rem
  background: #1a1a2e
  border: 1px solid #333
  border-radius: 6px
  min-width: 180px
  z-index: 10
  overflow: hidden

  button
    width: 100%
    justify-content: flex-start
    padding: 0.6rem 1rem
    background: none
    border: none
    color: #ccc
    cursor: pointer
    font-size: 0.8rem

    &:hover
      background: #2a2a4a

    & + button
      border-top: 1px solid #262640

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

.osc-bar
  flex-shrink: 0
  background: #0d0d1a
  border-top: 1px solid #333

.osc-header
  display: flex
  justify-content: space-between
  align-items: center
  padding: 0.5rem 1rem
  cursor: pointer
  font-size: 0.8rem
  color: #888

  &:hover
    color: #aaa

.osc-log
  padding: 0.5rem 1rem
  max-height: 200px
  overflow-y: auto
  font-family: monospace
  font-size: 0.7rem
  border-bottom: 1px solid #1a1a2e

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
