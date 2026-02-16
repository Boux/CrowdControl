<script>
export default {
  name: "ControlSettings",
  props: {
    control: { type: Object, required: true }
  },
  emits: ["update", "duplicate", "delete"],
  data: () => ({
    local: {}
  }),
  computed: {
    showMinMax() { return ["xy-pad", "fader"].includes(this.control?.type) },
    showOrientation() { return this.control?.type === "fader" },
    showOnOff() { return ["button", "toggle"].includes(this.control?.type) },
    typeLabel() {
      return { "xy-pad": "XY Pad", "fader": "Fader", "button": "Button", "toggle": "Toggle" }[this.control.type]
    }
  },
  watch: {
    control: {
      immediate: true,
      deep: true,
      handler(c) {
        if (!c) return
        this._skipLocalWatch = true
        this._editSnapshotSaved = false
        this.local = { ...c }
      }
    },
    local: {
      deep: true,
      handler() {
        if (this._skipLocalWatch) { this._skipLocalWatch = false; return }
        if (!this.control) return
        if (!this._editSnapshotSaved) { this.$emit("update", null, true); this._editSnapshotSaved = true }
        this.$emit("update", this.local)
      }
    }
  }
}
</script>

<template>
  <div class='control-settings'>
    <h3>{{ typeLabel }}</h3>

    <div class='section-label'>Layout</div>
    <table>
      <tr>
        <td>Label</td>
        <td colspan='3'><input v-model='local.label' type='text' /></td>
      </tr>
      <tr>
        <td>X</td>
        <td><input v-model.number='local.x' type='number' step='1' /></td>
        <td>Y</td>
        <td><input v-model.number='local.y' type='number' step='1' /></td>
      </tr>
      <tr>
        <td>W</td>
        <td><input v-model.number='local.w' type='number' step='1' /></td>
        <td>H</td>
        <td><input v-model.number='local.h' type='number' step='1' /></td>
      </tr>
      <tr v-if='showOrientation'>
        <td>Orient.</td>
        <td colspan='3'>
          <select v-model='local.orientation'>
            <option value='vertical'>Vertical</option>
            <option value='horizontal'>Horizontal</option>
          </select>
        </td>
      </tr>
    </table>

    <div class='section-label'>OSC</div>
    <table>
      <tr>
        <td>Address</td>
        <td colspan='3'><input v-model='local.oscAddress' type='text' /></td>
      </tr>
      <tr v-if='showMinMax'>
        <td>Min</td>
        <td><input v-model.number='local.min' type='number' step='0.01' /></td>
        <td>Max</td>
        <td><input v-model.number='local.max' type='number' step='0.01' /></td>
      </tr>
      <tr v-if='showOnOff'>
        <td>On</td>
        <td><input v-model.number='local.onValue' type='number' step='0.01' /></td>
        <td>Off</td>
        <td><input v-model.number='local.offValue' type='number' step='0.01' /></td>
      </tr>
    </table>

    <div class='section-label'>MIDI</div>
    <table>
      <tr>
        <td>Ch</td>
        <td colspan='3'><input type='number' min='1' max='16' step='1' :value='(local.midiChannel || 0) + 1' @change='local.midiChannel = +$event.target.value - 1' /></td>
      </tr>
      <tr v-if='control.type === "xy-pad"'>
        <td>CC X</td>
        <td><input v-model.number='local.midiCC' type='number' min='0' max='127' step='1' /></td>
        <td>CC Y</td>
        <td><input v-model.number='local.midiCCY' type='number' min='0' max='127' step='1' /></td>
      </tr>
      <tr v-else>
        <td>CC</td>
        <td colspan='3'><input v-model.number='local.midiCC' type='number' min='0' max='127' step='1' /></td>
      </tr>
    </table>

    <div class='control-actions'>
      <IconButton icon='copy' :icon-size='14' class='duplicate' @click='$emit("duplicate")'>Duplicate</IconButton>
      <IconButton icon='trash-2' :icon-size='14' class='delete' @click='$emit("delete")'>Delete</IconButton>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.control-settings
  h3
    font-size: 0.875rem
    margin: 0 0 0.5rem
    color: #4a9eff

.section-label
  font-size: 0.625rem
  text-transform: uppercase
  color: #555
  letter-spacing: 0.05em
  padding: 0.5rem 0 0.25rem

table
  width: 100%
  border-collapse: collapse

  td
    padding: 2px
    font-size: 0.75rem
    color: #888
    vertical-align: middle
    white-space: nowrap

    &:first-child, &:nth-child(3)
      width: 1px
      padding-right: 6px

  input, select
    width: 100%
    padding: 4px 6px
    border: 1px solid #333
    border-radius: 3px
    background: #0d0d1a
    color: white
    font-size: 0.75rem
    min-width: 0

    &:focus
      outline: none
      border-color: #4a9eff

.control-actions
  display: flex
  gap: 0.5rem
  margin-top: 0.75rem

  button
    flex: 1
    padding: 0.4rem
    border-radius: 4px
    font-size: 0.75rem
    cursor: pointer

  .duplicate
    background: transparent
    border: 1px solid #333
    color: #888

    &:hover
      border-color: #4a9eff
      color: white

  .delete
    background: transparent
    border: 1px solid #e74c3c33
    color: #e74c3c

    &:hover
      background: #e74c3c
      color: white
</style>
