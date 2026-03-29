<script>
import { useHostStore } from "../../stores/host"
import { io } from "socket.io-client"

import { DEFAULT_RELAY_SERVER } from "../../constants"
const DEFAULT_SERVERS = [DEFAULT_RELAY_SERVER]

export default {
  name: "SettingsView",
  data: () => ({
    local: {},
    midiOutputs: [],
    showAddModal: false,
    showDeleteConfirm: false,
    newServer: "",
    testResult: null,
    testing: false,
    _skipLocalWatch: false
  }),
  computed: {
    host() { return useHostStore() },
    backRoute() { return this.host.session ? "/dashboard" : "/" },
    canDelete() { return this.local.relay?.url && !DEFAULT_SERVERS.includes(this.local.relay.url) }
  },
  watch: {
    local: {
      deep: true,
      handler(val) {
        if (this._skipLocalWatch) return
        this.host.saveSettings(JSON.parse(JSON.stringify(val)))
      }
    }
  },
  methods: {
    addServer() {
      const url = this.newServer.trim().replace(/\/+$/, "")
      if (!url || this.local.relay.servers.includes(url)) return
      this.local.relay.servers.push(url)
      this.local.relay.url = url
      this.newServer = ""
      this.showAddModal = false
    },
    confirmDelete() {
      if (!this.canDelete) return
      this.showDeleteConfirm = true
    },
    deleteServer() {
      const url = this.local.relay.url
      this.local.relay.servers = this.local.relay.servers.filter(s => s !== url)
      this.local.relay.url = this.local.relay.servers[0] || ""
      this.showDeleteConfirm = false
    },
    async testServer() {
      this.testing = true
      this.testResult = null
      const url = this.local.relay.url
      if (!url) { this.testResult = { success: false, message: "No server selected" }; this.testing = false; return }

      const socket = io(url, { transports: ["websocket"], timeout: 5000, reconnection: false })

      const timeout = setTimeout(() => {
        socket.disconnect()
        this.testResult = { success: false, message: "Connection timed out" }
        this.testing = false
      }, 5000)

      socket.on("connect", () => {
        clearTimeout(timeout)
        socket.disconnect()
        this.testResult = { success: true, message: "Connected" }
        this.testing = false
      })

      socket.on("connect_error", (err) => {
        clearTimeout(timeout)
        socket.disconnect()
        this.testResult = { success: false, message: err.message }
        this.testing = false
      })
    },
    async refreshMidiOutputs() {
      this.midiOutputs = await this.host.getMidiOutputs()
    }
  },
  async created() {
    this._skipLocalWatch = true
    this.local = JSON.parse(JSON.stringify(this.host.settings))
    if (!this.local.relay.servers) this.local.relay.servers = [...DEFAULT_SERVERS]
    if (!("enabled" in this.local.osc)) this.local.osc.enabled = true
    if (!("enabled" in this.local.midi)) this.local.midi.enabled = false
    this.$nextTick(() => { this._skipLocalWatch = false })
    await this.refreshMidiOutputs()
  }
}
</script>

<template>
  <div class='settings'>
    <header>
      <IconButton icon='arrow-left' :to='backRoute' class='back'>Back</IconButton>
      <h1>Settings</h1>
    </header>

    <div class='section-label'>Relay Server</div>
    <table>
      <tr>
        <td>Server</td>
        <td>
          <select v-model='local.relay.url' :disabled='!local.relay.servers.length'>
            <option v-if='!local.relay.servers.length' value=''>No servers added</option>
            <option v-for='s in local.relay.servers' :key='s' :value='s'>{{ s }}</option>
          </select>
        </td>
      </tr>
      <tr>
        <td></td>
        <td>
          <div class='server-actions'>
            <IconButton icon='plus' :icon-size='14' class='action-btn' @click='showAddModal = true'>Add</IconButton>
            <IconButton icon='trash-2' :icon-size='14' class='action-btn' :class='{ disabled: !canDelete }' @click='confirmDelete'>Delete</IconButton>
            <IconButton icon='wifi' :icon-size='14' class='action-btn' @click='testServer' :disabled='testing'>{{ testing ? "Testing..." : "Test" }}</IconButton>
          </div>
          <div v-if='testResult' class='test-result' :class='testResult.success ? "success" : "error"'>
            {{ testResult.message }}
          </div>
        </td>
      </tr>
    </table>

    <div class='section-header'>
      <div class='section-label'>OSC Output</div>
      <label class='toggle'><input type='checkbox' v-model='local.osc.enabled' /><span>{{ local.osc.enabled ? "On" : "Off" }}</span></label>
    </div>
    <table v-if='local.osc.enabled'>
      <tr>
        <td>Host</td>
        <td><input v-model='local.osc.host' type='text' /></td>
      </tr>
      <tr>
        <td>Port</td>
        <td><input v-model.number='local.osc.port' type='number' /></td>
      </tr>
      <tr>
        <td>Protocol</td>
        <td>
          <select v-model='local.osc.protocol'>
            <option value='udp'>UDP</option>
            <option value='tcp'>TCP</option>
          </select>
        </td>
      </tr>
    </table>

    <div class='section-header'>
      <div class='section-label'>MIDI Output</div>
      <label class='toggle'><input type='checkbox' v-model='local.midi.enabled' /><span>{{ local.midi.enabled ? "On" : "Off" }}</span></label>
    </div>
    <table v-if='local.midi.enabled'>
      <tr>
        <td>Device</td>
        <td>
          <div class='midi-row'>
            <select v-model='local.midi.device'>
              <option value=''>None</option>
              <option v-for='d in midiOutputs' :key='d' :value='d'>{{ d }}</option>
            </select>
            <IconButton icon='refresh-cw' :icon-size='14' class='refresh' @click='refreshMidiOutputs' />
          </div>
        </td>
      </tr>
    </table>

    <div v-if='showAddModal' class='modal-overlay' @click.self='showAddModal = false'>
      <div class='modal'>
        <h3>Add Server</h3>
        <input v-model='newServer' type='text' placeholder='https://...' @keyup.enter='addServer' ref='addInput' />
        <div class='modal-actions'>
          <IconButton icon='check' class='modal-btn confirm' @click='addServer'>Add</IconButton>
          <IconButton icon='x' class='modal-btn cancel' @click='showAddModal = false'>Cancel</IconButton>
        </div>
      </div>
    </div>

    <div v-if='showDeleteConfirm' class='modal-overlay' @click.self='showDeleteConfirm = false'>
      <div class='modal'>
        <h3>Delete Server</h3>
        <p>Remove <strong>{{ local.relay.url }}</strong>?</p>
        <div class='modal-actions'>
          <IconButton icon='trash-2' class='modal-btn danger' @click='deleteServer'>Delete</IconButton>
          <IconButton icon='x' class='modal-btn cancel' @click='showDeleteConfirm = false'>Cancel</IconButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.settings
  max-width: 400px
  margin: 0 auto
  padding: 2rem

header
  display: flex
  align-items: center
  gap: 1rem
  margin-bottom: 2rem

  h1
    font-size: 1.5rem
    margin: 0

.back
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  text-decoration: none
  white-space: nowrap

  &:hover
    border-color: #4a9eff
    color: #4a9eff

.section-header
  display: flex
  align-items: center
  justify-content: space-between

.section-label
  font-size: 0.875rem
  text-transform: uppercase
  color: #444
  letter-spacing: 0.05em
  padding: 0.5rem 0 0.25rem

.toggle
  display: flex
  align-items: center
  gap: 0.5rem
  font-size: 0.75rem
  color: #666
  cursor: pointer

  input
    accent-color: #4a9eff

table
  width: 100%
  border-collapse: collapse

  td
    padding: 4px
    font-size: 0.8rem
    color: #888
    vertical-align: middle
    white-space: nowrap

    &:first-child
      width: 1px
      padding-right: 10px

  input, select
    width: 100%
    padding: 6px 8px
    border: 1px solid #333
    border-radius: 4px
    background: #1a1a2e
    color: white
    font-size: 0.8rem
    min-width: 0

    &:focus
      outline: none
      border-color: #4a9eff

.server-actions
  display: flex
  gap: 0.5rem

  .action-btn
    flex: 1
    padding: 4px 8px
    background: #1a1a2e
    border: 1px solid #333
    border-radius: 4px
    color: #888
    cursor: pointer
    font-size: 0.75rem
    justify-content: center

    &:hover
      border-color: #4a9eff
      color: #4a9eff

    &.disabled
      opacity: 0.3
      pointer-events: none

.test-result
  margin-top: 4px
  padding: 4px 8px
  border-radius: 4px
  font-size: 0.75rem

  &.success
    color: #2ecc71

  &.error
    color: #e74c3c

.midi-row
  display: flex
  gap: 0.5rem

  select
    flex: 1

  .refresh
    padding: 4px 8px
    background: #333
    border: 1px solid #444
    border-radius: 4px
    color: #888
    cursor: pointer
    font-size: 0.9rem

    &:hover
      border-color: #4a9eff
      color: #4a9eff

.modal-overlay
  position: fixed
  inset: 0
  background: rgba(0, 0, 0, 0.7)
  display: flex
  align-items: center
  justify-content: center
  z-index: 100

.modal
  background: #1a1a2e
  border: 1px solid #333
  border-radius: 8px
  padding: 1.5rem
  min-width: 320px

  h3
    margin: 0 0 1rem
    font-size: 1rem

  p
    font-size: 0.85rem
    color: #888
    margin: 0 0 1rem

    strong
      color: #ccc

  input
    width: 100%
    padding: 8px
    border: 1px solid #333
    border-radius: 4px
    background: #0d0d1a
    color: white
    font-size: 0.85rem
    margin-bottom: 1rem

    &:focus
      outline: none
      border-color: #4a9eff

.modal-actions
  display: flex
  gap: 0.5rem
  justify-content: flex-end

  .modal-btn
    padding: 6px 16px
    border: none
    border-radius: 4px
    cursor: pointer
    font-size: 0.8rem

    &.confirm
      background: #4a9eff
      color: white

    &.danger
      background: #e74c3c
      color: white

    &.cancel
      background: #333
      color: #888

      &:hover
        color: white
</style>
