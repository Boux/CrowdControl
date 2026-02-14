<script>
export default {
  name: "OscButton",
  props: {
    label: { type: String, default: "Button" }
  },
  emits: ["press", "release"],
  data: () => ({ pressed: false }),
  methods: {
    down(e) {
      e.preventDefault()
      e.target.setPointerCapture(e.pointerId)
      this.pressed = true
      this.$emit("press")
    },
    up(e) {
      e.preventDefault()
      e.target.releasePointerCapture(e.pointerId)
      this.pressed = false
      this.$emit("release")
    }
  }
}
</script>

<template>
  <button
    class='osc-button'
    :class='{ pressed }'
    @pointerdown='down'
    @pointerup='up'
    @pointercancel='up'
  >
    {{ label }}
  </button>
</template>

<style lang='sass' scoped>
.osc-button
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
  transition: transform 0.1s, box-shadow 0.1s

  &:hover
    background: #252542

  &.pressed
    transform: scale(0.95)
    background: #4a9eff
    box-shadow: 0 0 20px rgba(74, 158, 255, 0.5)
</style>
