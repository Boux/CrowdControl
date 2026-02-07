<script>
export default {
  name: "XYPad",
  props: {
    label: { type: String, default: "XY Pad" },
    valueX: { type: Number, default: 0.5 },
    valueY: { type: Number, default: 0.5 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 1 }
  },
  emits: ["change"],
  data: () => ({ touching: false }),
  computed: {
    indicatorStyle() {
      const x = ((this.valueX - this.min) / (this.max - this.min)) * 100
      const y = (1 - (this.valueY - this.min) / (this.max - this.min)) * 100
      return { left: `${x}%`, top: `${y}%` }
    }
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
      const px = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width))
      const py = Math.max(0, Math.min(1, (touch.clientY - rect.top) / rect.height))
      const x = px * (this.max - this.min) + this.min
      const y = (1 - py) * (this.max - this.min) + this.min
      this.$emit("change", { x, y })
    }
  }
}
</script>

<template>
  <div
    class='xy-pad'
    :class='{ touching }'
    @mousedown='start'
    @mousemove='move'
    @mouseup='end'
    @mouseleave='end'
    @touchstart='start'
    @touchmove='move'
    @touchend='end'
  >
    <div class='grid'></div>
    <div class='indicator' :style='indicatorStyle'></div>
    <span class='label'>{{ label }}</span>
    <span class='values'>X: {{ valueX.toFixed(2) }} | Y: {{ valueY.toFixed(2) }}</span>
  </div>
</template>

<style lang='sass' scoped>
.xy-pad
  position: relative
  width: 100%
  height: 100%
  background: #1a1a2e
  border-radius: 8px
  touch-action: none
  cursor: crosshair
  overflow: hidden

  &.touching
    box-shadow: 0 0 0 2px #4a9eff

.grid
  position: absolute
  inset: 0
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
  background-size: 25% 25%

.indicator
  position: absolute
  width: 20px
  height: 20px
  background: #4a9eff
  border-radius: 50%
  transform: translate(-50%, -50%)
  box-shadow: 0 0 10px rgba(74, 158, 255, 0.5)
  pointer-events: none

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

.values
  position: absolute
  bottom: 6px
  left: 0
  right: 0
  text-align: center
  font-size: 0.625rem
  color: #888
  pointer-events: none
</style>
