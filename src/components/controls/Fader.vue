<script>
export default {
  name: "Fader",
  props: {
    label: { type: String, default: "Fader" },
    value: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1 },
    orientation: { type: String, default: "vertical" }
  },
  emits: ["change"],
  data: () => ({ touching: false }),
  computed: {
    percent() { return ((this.value - this.min) / (this.max - this.min)) * 100 },
    fillStyle() { return this.orientation === "vertical" ? { height: `${this.percent}%` } : { width: `${this.percent}%` } },
    handleStyle() { return this.orientation === "vertical" ? { bottom: `${this.percent}%` } : { left: `${this.percent}%` } }
  },
  methods: {
    start(e) {
      e.preventDefault()
      this.touching = true
      this.update(e)
    },
    move(e) {
      if (!this.touching) return
      e.preventDefault()
      this.update(e)
    },
    end() {
      this.touching = false
    },
    update(e) {
      const rect = this.$el.getBoundingClientRect()
      const touch = e.touches?.[0] || e
      const p = this.orientation === "vertical"
        ? 1 - (touch.clientY - rect.top) / rect.height
        : (touch.clientX - rect.left) / rect.width
      const clamped = Math.max(0, Math.min(1, p))
      const value = clamped * (this.max - this.min) + this.min
      this.$emit("change", value)
    }
  }
}
</script>

<template>
  <div
    class='fader'
    :class='[orientation, { touching }]'
    @mousedown='start'
    @mousemove='move'
    @mouseup='end'
    @mouseleave='end'
    @touchstart='start'
    @touchmove='move'
    @touchend='end'
  >
    <div class='fill' :style='fillStyle'></div>
    <div class='handle' :style='handleStyle'></div>
    <span class='label'>{{ label }}</span>
    <span class='val'>{{ value.toFixed(2) }}</span>
  </div>
</template>

<style lang='sass' scoped>
.fader
  position: relative
  width: 100%
  height: 100%
  background: #1a1a2e
  border-radius: 8px
  touch-action: none
  cursor: pointer
  overflow: hidden

  &.touching
    box-shadow: 0 0 0 2px #4a9eff

.fill
  position: absolute
  background: linear-gradient(to top, #4a9eff, #7b68ee)

  .vertical &
    bottom: 0
    left: 0
    right: 0
    border-radius: 0 0 8px 8px

  .horizontal &
    top: 0
    bottom: 0
    left: 0
    border-radius: 8px 0 0 8px

.handle
  position: absolute
  background: #fff
  box-shadow: 0 2px 8px rgba(0,0,0,0.3)
  pointer-events: none

  .vertical &
    left: 0
    right: 0
    height: 6px
    transform: translateY(50%)
    border-radius: 2px

  .horizontal &
    top: 0
    bottom: 0
    width: 6px
    transform: translateX(-50%)
    border-radius: 2px

.label
  position: absolute
  top: 6px
  left: 0
  right: 0
  text-align: center
  font-size: 0.75rem
  font-weight: 500
  pointer-events: none
  opacity: 0.7

.val
  position: absolute
  bottom: 6px
  left: 0
  right: 0
  text-align: center
  font-size: 0.625rem
  color: #888
  pointer-events: none
</style>
