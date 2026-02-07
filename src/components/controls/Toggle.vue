<script>
export default {
  name: "Toggle",
  props: {
    label: { type: String, default: "Toggle" },
    value: { type: Number, default: 0 },
    onValue: { type: Number, default: 1 },
    offValue: { type: Number, default: 0 }
  },
  emits: ["change"],
  computed: {
    isOn() { return this.value === this.onValue }
  },
  methods: {
    toggle(e) {
      e.preventDefault()
      this.$emit("change", this.isOn ? this.offValue : this.onValue)
    }
  }
}
</script>

<template>
  <button
    class='toggle-button'
    :class='{ on: isOn }'
    @mousedown='toggle'
    @touchstart='toggle'
  >
    {{ label }}
  </button>
</template>

<style lang='sass' scoped>
.toggle-button
  width: 100%
  height: 100%
  padding: 0
  border: none
  border-radius: 8px
  background: #1a1a2e
  color: #fff
  font-size: 0.75rem
  font-weight: 500
  cursor: pointer
  touch-action: manipulation
  user-select: none
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden
  transition: background 0.15s, box-shadow 0.15s

  &:hover
    background: #252542

  &.on
    background: #4a9eff
    box-shadow: 0 0 20px rgba(74, 158, 255, 0.5)
</style>
