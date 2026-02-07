<script>
import { useRelayStore } from "../../stores/relay"
import { useSessionStore } from "../../stores/session"

export default {
  name: "HomeView",
  data: () => ({ sessionCode: "", connecting: false }),
  computed: {
    relay() { return useRelayStore() },
    session() { return useSessionStore() }
  },
  async mounted() {
    const relayUrl = import.meta.env.VITE_RELAY_URL || "http://localhost:3001"
    await this.relay.connect(relayUrl)
  },
  methods: {
    async join() {
      if (!this.sessionCode.trim()) return
      this.connecting = true
      await this.session.join(this.sessionCode.trim())
        .then(() => this.$router.push(`/session/${this.sessionCode.trim()}`))
        .catch(err => alert(err.message))
      this.connecting = false
    }
  }
}
</script>

<template>
  <div class='home'>
    <h1>CrowdOSC</h1>
    <p class='subtitle'>Join a session to control</p>

    <div class='status' :class='{ connected: relay.connected }'>
      {{ relay.connected ? "Connected" : "Connecting..." }}
    </div>

    <div class='join-form'>
      <input v-model='sessionCode' type='text' placeholder='Session code' @keyup.enter='join' />
      <button @click='join' :disabled='!relay.connected || connecting'>Join</button>
    </div>
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
    background: linear-gradient(135deg, #4a9eff, #7b68ee)
    border: none
    border-radius: 8px
    color: white
    font-weight: 600
    cursor: pointer

    &:disabled
      opacity: 0.5
</style>
