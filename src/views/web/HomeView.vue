<script>
import { useRelayStore } from "../../stores/relay"
import { useSessionStore } from "../../stores/session"
import QrScanner from "qr-scanner"

export default {
  name: "HomeView",
  data: () => ({
    sessionCode: "",
    connecting: false,
    scanning: false,
    scanError: null
  }),
  computed: {
    relay() { return useRelayStore() },
    session() { return useSessionStore() }
  },
  async mounted() {
    await this.relay.connect()
  },
  beforeUnmount() {
    this.stopScan()
  },
  methods: {
    async join(code) {
      const sessionCode = (code || this.sessionCode).trim()
      if (!sessionCode) return
      this.connecting = true
      await this.session.join(sessionCode)
        .then(() => this.$router.push(`/session/${sessionCode}`))
        .catch(err => alert(err.message))
      this.connecting = false
    },
    startScan() {
      this.scanning = true
      this.scanError = null
      this.$nextTick(() => {
        const video = this.$refs.video
        this.scanner = new QrScanner(video, ({ data }) => {
          this.handleScanResult(data)
        }, { preferredCamera: "environment", highlightScanRegion: true })
        this.scanner.start().catch(() => { this.scanError = "Could not access camera" })
      })
    },
    stopScan() {
      this.scanner?.stop()
      this.scanner?.destroy()
      this.scanner = null
      this.scanning = false
    },
    handleScanResult(data) {
      this.stopScan()
      const match = data.match(/\/session\/([^/]+)/)
      if (match) return this.join(match[1])
      // Treat raw text as session code
      this.join(data)
    }
  }
}
</script>

<template>
  <div class='home'>
    <h1>Crowd Control</h1>
    <p class='subtitle'>Join a session to control</p>

    <div class='status' :class='{ connected: relay.connected }'>
      {{ relay.connected ? "Connected" : "Connecting..." }}
    </div>

    <div v-if='scanning' class='scanner'>
      <video ref='video'></video>
      <p v-if='scanError' class='scan-error'>{{ scanError }}</p>
      <IconButton class='cancel' @click='stopScan'>Cancel</IconButton>
    </div>

    <template v-else>
      <IconButton class='scan-btn' @click='startScan' :disabled='!relay.connected'>Scan QR Code</IconButton>

      <div class='divider'><span>or enter code</span></div>

      <div class='join-form'>
        <input v-model='sessionCode' type='text' placeholder='Session code' @keyup.enter='join()' />
        <IconButton @click='join()' :disabled='!relay.connected || connecting'>Join</IconButton>
      </div>
    </template>
  </div>
</template>

<style lang='sass' scoped>
.home
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  min-height: 100vh
  padding: 2rem
  text-align: center

h1
  font-size: 2.5rem
  margin-bottom: 0.5rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent

.subtitle
  color: #888
  margin-bottom: 2rem

.status
  padding: 0.5rem 1rem
  border-radius: 20px
  font-size: 0.875rem
  margin-bottom: 2rem
  background: #2a2a2a

  &.connected
    background: rgba(74, 158, 255, 0.2)
    color: #4a9eff

.scan-btn
  width: 100%
  max-width: 300px
  padding: 1rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  border: none
  border-radius: 8px
  color: white
  font-size: 1rem
  font-weight: 600
  cursor: pointer

  &:disabled
    opacity: 0.5

.divider
  width: 100%
  max-width: 300px
  display: flex
  align-items: center
  margin: 1.25rem 0
  color: #555
  font-size: 0.75rem

  &::before, &::after
    content: ""
    flex: 1
    border-top: 1px solid #333

  span
    padding: 0 0.75rem

.join-form
  display: flex
  gap: 0.5rem
  width: 100%
  max-width: 300px

  input
    flex: 1
    padding: 0.75rem 1rem
    border: 1px solid #333
    border-radius: 8px
    background: #1a1a2e
    color: white
    font-size: 1rem

    &:focus
      outline: none
      border-color: #4a9eff

  button
    padding: 0.75rem 1.5rem
    background: #333
    border: none
    border-radius: 8px
    color: white
    font-weight: 600
    cursor: pointer

    &:disabled
      opacity: 0.5

.scanner
  width: 100%
  max-width: 300px
  display: flex
  flex-direction: column
  align-items: center
  gap: 1rem

  video
    width: 100%
    border-radius: 8px
    background: #000

.scan-error
  color: #e74c3c
  font-size: 0.875rem

.cancel
  padding: 0.75rem 1.5rem
  background: #333
  border: none
  border-radius: 8px
  color: white
  cursor: pointer
</style>
