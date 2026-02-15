<script>
export default {
  name: "ControlEditor",
  props: {
    control: { type: Object, required: true }
  },
  emits: ["update", "delete"],
  data() {
    return { expanded: false, local: { ...this.control } }
  },
  computed: {
    typeLabel() {
      return { "xy-pad": "XY Pad", "fader": "Fader", "button": "Button", "toggle": "Toggle" }[this.control.type]
    },
    showMinMax() { return ["xy-pad", "fader"].includes(this.control.type) },
    showOrientation() { return this.control.type === "fader" },
    showOnOff() { return ["button", "toggle"].includes(this.control.type) }
  },
  watch: {
    control: {
      deep: true,
      handler(c) { this.local = { ...c } }
    }
  },
  methods: {
    save() {
      this.$emit("update", this.local)
      this.expanded = false
    },
    cancel() {
      this.local = { ...this.control }
      this.expanded = false
    }
  }
}
</script>

<template>
  <div class='control-editor' :class='{ expanded }'>
    <div class='header' @click='expanded = !expanded'>
      <span class='type'>{{ typeLabel }}</span>
      <span class='label'>{{ control.label }}</span>
      <span class='address'>{{ control.oscAddress }}</span>
      <span class='toggle'><Icon :name='expanded ? "chevron-up" : "chevron-down"' :size='16' /></span>
    </div>

    <div v-if='expanded' class='form'>
      <div class='field'>
        <label>Label</label>
        <input v-model='local.label' type='text' />
      </div>

      <div class='field'>
        <label>OSC Address</label>
        <input v-model='local.oscAddress' type='text' />
      </div>

      <div v-if='showMinMax' class='row'>
        <div class='field'>
          <label>Min</label>
          <input v-model.number='local.min' type='number' step='0.01' />
        </div>
        <div class='field'>
          <label>Max</label>
          <input v-model.number='local.max' type='number' step='0.01' />
        </div>
      </div>

      <div v-if='showOrientation' class='field'>
        <label>Orientation</label>
        <select v-model='local.orientation'>
          <option value='vertical'>Vertical</option>
          <option value='horizontal'>Horizontal</option>
        </select>
      </div>

      <div v-if='showOnOff' class='row'>
        <div class='field'>
          <label>On Value</label>
          <input v-model.number='local.onValue' type='number' step='0.01' />
        </div>
        <div class='field'>
          <label>Off Value</label>
          <input v-model.number='local.offValue' type='number' step='0.01' />
        </div>
      </div>

      <div class='actions'>
        <IconButton icon='check' class='save' @click='save'>Save</IconButton>
        <IconButton icon='x' class='cancel' @click='cancel'>Cancel</IconButton>
        <IconButton icon='trash-2' class='delete' @click='$emit("delete")'>Delete</IconButton>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.control-editor
  background: #1a1a2e
  border-radius: 8px
  overflow: hidden

  &.expanded .header
    border-bottom: 1px solid #333

.header
  display: flex
  align-items: center
  gap: 1rem
  padding: 1rem
  cursor: pointer

  &:hover
    background: #222242

.type
  padding: 0.25rem 0.5rem
  background: #4a9eff
  border-radius: 4px
  font-size: 0.625rem
  text-transform: uppercase
  font-weight: 600

.label
  font-weight: 500
  flex: 1

.address
  font-size: 0.75rem
  color: #666
  font-family: monospace

.toggle
  width: 20px
  text-align: center
  color: #888

.form
  padding: 1rem

.field
  display: flex
  flex-direction: column
  gap: 0.25rem
  margin-bottom: 0.75rem

  label
    font-size: 0.75rem
    color: #888

  input, select
    padding: 0.5rem
    border: 1px solid #333
    border-radius: 4px
    background: #0d0d1a
    color: white

    &:focus
      outline: none
      border-color: #4a9eff

.row
  display: flex
  gap: 1rem

  .field
    flex: 1

.actions
  display: flex
  gap: 0.5rem
  margin-top: 1rem
  padding-top: 1rem
  border-top: 1px solid #333

  button
    padding: 0.5rem 1rem
    border: none
    border-radius: 4px
    cursor: pointer

    &.save
      background: #4a9eff
      color: white

    &.cancel
      background: #333
      color: white

    &.delete
      background: transparent
      color: #e74c3c
      margin-left: auto
</style>
