<script>
import { useHostStore } from "../../stores/host"

export default {
  name: "SetupView",
  data: () => ({
    sessionName: "",
    connecting: false,
    recentKey: 0,
    confirmIndex: null
  }),
  computed: {
    host() { return useHostStore() },
    valid() { return this.sessionName.trim() },
    recentSessions() { this.recentKey; return this.host.getRecent() }
  },
  methods: {
    async start(restoreSeats) {
      this.connecting = true

      const relayUrl = await window.electronAPI.relay.getUrl()
      const relayResult = await this.host.connectRelay(relayUrl)
      if (!relayResult.success) {
        alert("Failed to connect to relay: " + relayResult.error)
        this.connecting = false
        return
      }

      await this.host.connectOsc()
      if (this.host.settings.midi.device) await this.host.connectMidi()

      const sessionResult = await this.host.createSession(this.sessionName.trim())
      if (!sessionResult.success) {
        alert("Failed to create session: " + sessionResult.error)
        this.connecting = false
        return
      }

      if (Array.isArray(restoreSeats)) {
        this.host.session.seats = restoreSeats
        this.host.syncSession()
      }

      this.$router.push("/dashboard")
    },
    reopen(entry) {
      this.sessionName = entry.name
      this.start(entry.seats)
    },
    askDelete(index) {
      this.confirmIndex = index
    },
    deleteRecent(index) {
      this.host.deleteRecent(index)
      this.confirmIndex = null
      this.recentKey++
    },
    cancelDelete() {
      this.confirmIndex = null
    },
    timeAgo(ts) {
      const diff = Date.now() - ts
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return "just now"
      if (mins < 60) return `${mins}m ago`
      const hours = Math.floor(mins / 60)
      if (hours < 24) return `${hours}h ago`
      return `${Math.floor(hours / 24)}d ago`
    }
  }
}
</script>

<template>
  <div class='setup'>
    <h1>Crowd Control</h1>
    <p class='subtitle'>Session Setup</p>

    <form @submit.prevent='start'>
      <div class='section'>
        <h2>Session</h2>
        <div class='field'>
          <label>Session Name</label>
          <input v-model='sessionName' type='text' placeholder='My Session' />
        </div>
      </div>

      <IconButton icon='play' type='submit' :disabled='!valid || connecting'>
        {{ connecting ? "Starting..." : "Start Session" }}
      </IconButton>
    </form>

    <IconButton icon='settings' to='/settings' class='settings-link'>Settings</IconButton>

    <div v-if='recentSessions.length' class='recent'>
      <h2>Recent Sessions</h2>
      <div v-for='(entry, i) in recentSessions' :key='i' class='recent-entry'>
        <div class='recent-info'>
          <span class='recent-name'>{{ entry.name }}</span>
          <span class='recent-meta'>{{ entry.seats?.length || 0 }} seats &middot; {{ timeAgo(entry.savedAt) }}</span>
        </div>
        <div class='recent-actions'>
          <IconButton icon='folder-open' class='reopen' @click='reopen(entry)' :disabled='connecting'>Reopen</IconButton>
          <IconButton icon='x' class='remove' @click='askDelete(i)' />
        </div>
        <div v-if='confirmIndex === i' class='confirm-overlay'>
          <span>Delete "{{ entry.name }}"?</span>
          <div class='confirm-actions'>
            <IconButton icon='check' class='confirm-yes' @click='deleteRecent(i)'>Yes</IconButton>
            <IconButton icon='x' class='confirm-no' @click='cancelDelete'>No</IconButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.setup
  max-width: 500px
  margin: 0 auto
  padding: 2rem

h1
  font-size: 2rem
  margin-bottom: 0.5rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  -webkit-background-clip: text
  -webkit-text-fill-color: transparent

.subtitle
  color: #888
  margin-bottom: 2rem

.section
  margin-bottom: 1.5rem

  h2
    font-size: 1rem
    color: #888
    margin-bottom: 0.75rem

.field
  display: flex
  flex-direction: column
  gap: 0.25rem
  margin-bottom: 0.75rem

  label
    font-size: 0.75rem
    color: #666

  input, select
    padding: 0.75rem
    border: 1px solid #333
    border-radius: 6px
    background: #1a1a2e
    color: white
    font-size: 1rem

    &:focus
      outline: none
      border-color: #4a9eff

button[type='submit']
  width: 100%
  padding: 1rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  border: none
  border-radius: 8px
  color: white
  font-size: 1rem
  font-weight: 600
  cursor: pointer
  margin-top: 1rem

  &:disabled
    opacity: 0.5

.settings-link
  display: block
  text-align: center
  margin-top: 1rem
  color: #666
  font-size: 0.875rem
  text-decoration: none

  &:hover
    color: #4a9eff

.recent
  margin-top: 2rem
  border-top: 1px solid #222

  h2
    font-size: 1rem
    color: #888
    margin: 1.5rem 0 0.75rem

.recent-entry
  position: relative
  display: flex
  align-items: center
  justify-content: space-between
  padding: 0.75rem
  background: #1a1a2e
  border-radius: 6px
  margin-bottom: 0.5rem

.recent-info
  display: flex
  flex-direction: column
  gap: 0.25rem

.recent-name
  font-weight: 500

.recent-meta
  font-size: 0.75rem
  color: #666

.recent-actions
  display: flex
  gap: 0.5rem
  align-items: center

  .reopen
    padding: 0.5rem 1rem
    background: #333
    border: none
    border-radius: 4px
    color: white
    cursor: pointer

    &:hover
      background: #4a9eff

    &:disabled
      opacity: 0.5

  .remove
    padding: 0.5rem 0.75rem
    background: transparent
    border: none
    color: #666
    cursor: pointer
    font-size: 1rem

    &:hover
      color: #e74c3c

.confirm-overlay
  position: absolute
  inset: 0
  background: rgba(13, 13, 26, 0.9)
  border-radius: 6px
  display: flex
  align-items: center
  justify-content: center
  gap: 1rem

  span
    font-size: 0.85rem
    color: #e74c3c

.confirm-actions
  display: flex
  gap: 0.5rem

  button
    padding: 0.4rem 1rem
    border: none
    border-radius: 4px
    cursor: pointer
    font-size: 0.75rem

  .confirm-yes
    background: #e74c3c
    color: white

    &:hover
      background: #c0392b

  .confirm-no
    background: #333
    color: #888

    &:hover
      color: white
</style>
