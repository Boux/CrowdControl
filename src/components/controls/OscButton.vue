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
  background: var(--bg-surface, #1a1a2e)
  color: #fff
  font-size: 0.75rem
  font-weight: 600
  text-shadow: 0 1px 2px black
  cursor: pointer
  touch-action: manipulation
  user-select: none
  display: flex
  align-items: center
  justify-content: center
  overflow: hidden
  outline: 1px solid rgba(0, 0, 0, 0.5)
  transition: transform 0.1s, box-shadow 0.1s, outline 0.1s

  &:hover
    background: var(--bg-hover, #252542)

  &.pressed
    transform: scale(0.95)
    background: var(--accent, #4a9eff)
    outline: 2px solid var(--accent, #4a9eff)
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent, #4a9eff) 50%, transparent)
</style>
