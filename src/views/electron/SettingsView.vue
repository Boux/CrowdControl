<script>
import { useHostStore } from "../../stores/host"

export default {
  name: "SettingsView",
  data: () => ({
    local: {},
    midiOutputs: [],
    _skipLocalWatch: false
  }),
  computed: {
    host() { return useHostStore() },
    backRoute() { return this.host.session ? "/dashboard" : "/" }
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
    async refreshMidiOutputs() {
      this.midiOutputs = await this.host.getMidiOutputs()
    }
  },
  async created() {
    this._skipLocalWatch = true
    this.local = JSON.parse(JSON.stringify(this.host.settings))
    this.$nextTick(() => { this._skipLocalWatch = false })
    await this.refreshMidiOutputs()
  }
}
</script>

<template>
  <div class='settings'>
    <header>
      <router-link :to='backRoute' class='back'>&larr; Back</router-link>
      <h1>Settings</h1>
    </header>

    <div class='section-label'>Relay Server</div>
    <table>
      <tr>
        <td>URL</td>
        <td><input v-model='local.relay.url' type='text' /></td>
      </tr>
    </table>

    <div class='section-label'>OSC Output</div>
    <table>
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

    <div class='section-label'>MIDI Output</div>
    <table>
      <tr>
        <td>Device</td>
        <td>
          <div class='midi-row'>
            <select v-model='local.midi.device'>
              <option value=''>Disabled</option>
              <option v-for='d in midiOutputs' :key='d' :value='d'>{{ d }}</option>
            </select>
            <button type='button' class='refresh' @click='refreshMidiOutputs'>&#x21bb;</button>
          </div>
        </td>
      </tr>
    </table>
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

.section-label
  font-size: 0.625rem
  text-transform: uppercase
  color: #444
  font-size: 0.875rem
  letter-spacing: 0.05em
  padding: 0.5rem 0 0.25rem

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
</style>
