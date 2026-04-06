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
    oscLogOpen: false,
    midiLogOpen: false,
    learnMode: false,
    sweepValue: 0
  }),
  computed: {
    host() { return useHostStore() },
    session() { return this.host.session },
    seats() { return this.host.seats },
    oscLogs() { return this.host.oscLogs },
    midiLogs() { return this.host.midiLogs },
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
    onSweep(e) {
      this.sweepValue = +e.target.value
      this.host.sendAllCCs(this.sweepValue)
    },
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
        <div class='header-left'>
          <IconButton icon='arrow-left' class='end' @click='endSession' />
          <div class='session-info'>
            <h1>{{ session?.name }}</h1>
            <div class='connection-badges'>
              <span class='badge' :class='{ connected: host.oscConnected }'>
                OSC {{ oscConfig.host }}:{{ oscConfig.port }}
              </span>
              <span v-if='host.midiConnected' class='badge connected'>
                MIDI {{ host.settings.midi.device }}
              </span>
              <router-link to='/settings' class='settings-link'>
                <Icon name='settings' :size='12' />
              </router-link>
            </div>
          </div>
        </div>
        <div class='header-right'>
          <SessionQr v-if='host.live' :url='sessionUrl' :code='session?.id' />
          <IconButton v-if='host.live' icon='wifi-off' class='offline-btn' @click='goOffline'>Go Offline</IconButton>
          <IconButton v-else icon='wifi' class='live-btn' @click='goLive' :disabled='goingLive'>
            {{ goingLive ? "Connecting..." : "Go Live" }}
          </IconButton>
        </div>
      </header>

      <div class='seats-section'>
        <div class='toolbar'>
          <div class='toolbar-left'>
            <h2>Seats <span class='count'>{{ seats.length }}</span></h2>
          </div>
          <div class='toolbar-right'>
            <IconButton icon='plus' class='btn-add' @click='addSeat'>Add Seat</IconButton>
            <IconButton icon='sliders-vertical' class='btn-learn' :class='{ active: learnMode }' @click='learnMode = !learnMode'>Learn</IconButton>
            <div class='menu-wrap' ref='menuWrap'>
              <IconButton icon='ellipsis-vertical' class='btn-menu' @click='menuOpen = !menuOpen' />
              <div v-if='menuOpen' class='menu-dropdown'>
                <IconButton icon='download' @click='importSession(); menuOpen = false'>Import</IconButton>
                <IconButton icon='upload' @click='exportSession(); menuOpen = false'>Export</IconButton>
                <IconButton icon='send' @click='resendAll'>Resend All</IconButton>
              </div>
            </div>
          </div>
        </div>

        <div v-if='learnMode' class='sweep-bar'>
          <span class='sweep-label'>Sweep</span>
          <input
            type='range'
            min='0'
            max='127'
            :value='sweepValue'
            class='sweep-fader'
            @input='onSweep'
          />
          <span class='sweep-value'>{{ sweepValue }}</span>
          <button class='btn-send-all' @click='host.sendAllCCs()'>
            <Icon name='send' :size='12' />
            Send All
          </button>
        </div>

        <div class='seats-grid'>
          <SeatCard v-for='seat in seats' :key='seat.id' :seat='seat' :auto-rename='seat.id === newSeatId' :learn-mode='learnMode' @duplicate='id => newSeatId = id' />
        </div>
      </div>
    </div>

    <div class='log-bar'>
      <div v-if='oscLogOpen' class='log-panel'>
        <div v-for='(log, i) in oscLogs' :key='i' class='log-entry'>
          <span class='log-addr'>{{ log.address }}</span>
          <span class='log-val'>{{ log.args }}</span>
        </div>
        <span v-if='!oscLogs.length' class='empty'>No messages yet</span>
      </div>
      <div v-if='midiLogOpen' class='log-panel'>
        <div v-for='(log, i) in midiLogs' :key='i' class='log-entry'>
          <span class='log-addr'>Ch {{ log.ch + 1 }} CC {{ log.cc }}</span>
          <span class='log-val'>{{ log.value }}</span>
        </div>
        <span v-if='!midiLogs.length' class='empty'>No messages yet</span>
      </div>
      <div class='log-tabs'>
        <div class='log-tab' :class='{ active: oscLogOpen }' @click='oscLogOpen = !oscLogOpen; midiLogOpen = false'>
          <span>OSC</span>
          <span class='log-count'>{{ oscLogs.length }}</span>
        </div>
        <div class='log-tab' :class='{ active: midiLogOpen }' @click='midiLogOpen = !midiLogOpen; oscLogOpen = false'>
          <span>MIDI</span>
          <span class='log-count'>{{ midiLogs.length }}</span>
        </div>
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
  padding: 1.25rem 1.5rem

// Header
header
  display: flex
  align-items: center
  justify-content: space-between
  padding-bottom: 1.25rem
  margin-bottom: 1.25rem
  border-bottom: 1px solid var(--border)

.header-left
  display: flex
  align-items: center
  gap: 0.75rem

.header-right
  display: flex
  align-items: center
  gap: 0.75rem

.end
  width: 32px
  height: 32px
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 6px
  color: var(--text-dim)
  cursor: pointer

  &:hover
    border-color: var(--red)
    color: var(--red)

.session-info
  h1
    font-size: 1.1rem
    font-weight: 600
    letter-spacing: -0.01em

.connection-badges
  display: flex
  align-items: center
  gap: 0.4rem
  margin-top: 0.25rem

.badge
  font-family: var(--font-mono)
  font-size: 0.6rem
  padding: 0.15rem 0.5rem
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 3px
  color: var(--text-muted)

  &.connected
    color: var(--green)
    border-color: rgba(46, 204, 113, 0.25)
    background: rgba(46, 204, 113, 0.06)

.settings-link
  display: inline-flex
  color: var(--text-muted)
  text-decoration: none
  margin-left: 0.15rem

  &:hover
    color: var(--accent)

.live-btn
  padding: 0.5rem 1rem
  background: var(--green)
  border: none
  border-radius: 6px
  color: white
  cursor: pointer
  white-space: nowrap
  font-weight: 600
  font-size: 0.8rem

  &:hover
    filter: brightness(1.1)

  &:disabled
    opacity: 0.4

.offline-btn
  padding: 0.5rem 1rem
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 6px
  color: var(--text-dim)
  cursor: pointer
  white-space: nowrap
  font-size: 0.8rem

  &:hover
    border-color: var(--orange)
    color: var(--orange)

// Toolbar
.toolbar
  display: flex
  justify-content: space-between
  align-items: center
  margin-bottom: 1rem

  h2
    font-size: 0.85rem
    font-weight: 600
    text-transform: uppercase
    letter-spacing: 0.06em
    color: var(--text-dim)

  .count
    font-family: var(--font-mono)
    font-size: 0.7rem
    color: var(--text-muted)
    margin-left: 0.25rem

.toolbar-left, .toolbar-right
  display: flex
  align-items: center
  gap: 0.4rem

.btn-add
  padding: 0.4rem 0.75rem
  background: var(--accent)
  border: none
  border-radius: 5px
  color: white
  cursor: pointer
  font-size: 0.75rem
  font-weight: 600

  &:hover
    filter: brightness(1.15)

.btn-learn
  padding: 0.4rem 0.75rem
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 5px
  color: var(--text-dim)
  cursor: pointer
  font-size: 0.75rem

  &:hover
    border-color: var(--orange)
    color: var(--orange)

  &.active
    background: var(--orange)
    border-color: var(--orange)
    color: white

.btn-menu
  width: 32px
  height: 28px
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 5px
  color: var(--text-dim)
  cursor: pointer

  &:hover
    border-color: var(--accent)
    color: var(--accent)

.menu-wrap
  position: relative

.menu-dropdown
  position: absolute
  right: 0
  top: 100%
  margin-top: 4px
  background: var(--bg-raised)
  border: 1px solid var(--border-light)
  border-radius: 8px
  min-width: 170px
  z-index: 10
  overflow: hidden
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)

  button
    width: 100%
    justify-content: flex-start
    padding: 0.55rem 0.85rem
    background: none
    border: none
    color: var(--text)
    cursor: pointer
    font-size: 0.75rem
    font-family: var(--font-ui)

    &:hover
      background: var(--bg-hover)

    & + button
      border-top: 1px solid var(--border)

// Sweep bar
.sweep-bar
  display: flex
  align-items: center
  gap: 0.6rem
  padding: 0.4rem 0.6rem
  background: var(--bg-surface)
  border: 1px solid var(--border)
  border-radius: 6px
  margin-bottom: 1rem

.sweep-label
  font-family: var(--font-mono)
  font-size: 0.65rem
  color: var(--text-dim)
  white-space: nowrap
  text-transform: uppercase
  letter-spacing: 0.04em

.sweep-fader
  flex: 1
  accent-color: var(--orange)
  height: 4px

.sweep-value
  font-family: var(--font-mono)
  font-size: 0.7rem
  color: var(--orange)
  font-weight: 700
  min-width: 1.75rem
  text-align: right

.btn-send-all
  display: inline-flex
  align-items: center
  gap: 0.3rem
  padding: 0.3rem 0.6rem
  background: var(--orange)
  border: none
  border-radius: 4px
  color: white
  font-family: var(--font-ui)
  font-size: 0.65rem
  font-weight: 600
  cursor: pointer
  white-space: nowrap

  &:hover
    filter: brightness(1.15)

// Seats grid
.seats-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr))
  gap: 0.75rem

// Log bar
.log-bar
  flex-shrink: 0
  background: var(--bg-raised)
  border-top: 1px solid var(--border)

.log-tabs
  display: flex

.log-tab
  flex: 1
  display: flex
  align-items: center
  justify-content: center
  gap: 0.5rem
  padding: 0.45rem 1rem
  cursor: pointer
  font-size: 0.7rem
  font-weight: 500
  color: var(--text-muted)
  transition: color 0.15s

  &:hover
    color: var(--text-dim)

  &.active
    color: var(--accent)

  & + .log-tab
    border-left: 1px solid var(--border)

.log-count
  font-family: var(--font-mono)
  font-size: 0.6rem
  padding: 0.05rem 0.35rem
  background: var(--bg-surface)
  border-radius: 3px

.log-panel
  padding: 0.4rem 0.75rem
  max-height: 180px
  overflow-y: auto
  font-family: var(--font-mono)
  font-size: 0.65rem
  border-bottom: 1px solid var(--border)

  .empty
    color: var(--text-muted)
    font-family: var(--font-ui)

.log-entry
  display: flex
  gap: 0.75rem
  padding: 0.2rem 0
  border-bottom: 1px solid var(--border)

  &:last-child
    border-bottom: none

.log-addr
  color: var(--accent)

.log-val
  color: var(--text-dim)

</style>
