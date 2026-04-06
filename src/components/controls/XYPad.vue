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
  data: () => ({ touching: false, axis: null }),
  computed: {
    indicatorStyle() {
      const x = ((this.valueX - this.min) / (this.max - this.min)) * 100
      const y = (1 - (this.valueY - this.min) / (this.max - this.min)) * 100
      return { left: `${x}%`, top: `${y}%` }
    }
  },
  methods: {
    start(e) {
      if (e.button === 2) e.preventDefault()
      e.target.setPointerCapture(e.pointerId)
      this.touching = true
      this.axis = e.button === 2 ? "x" : e.button === 1 ? "y" : null
      this.update(e)
    },
    move(e) {
      if (!this.touching) return
      e.preventDefault()
      this.update(e)
    },
    end(e) {
      this.touching = false
      e.target.releasePointerCapture(e.pointerId)
    },
    update(e) {
      const rect = this.$el.getBoundingClientRect()
      const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
      const x = this.axis === "y" ? this.valueX : px * (this.max - this.min) + this.min
      const y = this.axis === "x" ? this.valueY : (1 - py) * (this.max - this.min) + this.min
      if (x !== this.valueX || y !== this.valueY) this.$emit("change", [x, y], this.axis)
    }
  }
}
</script>

<template>
  <div
    class='xy-pad'
    :class='{ touching }'
    @pointerdown='start'
    @pointermove='move'
    @pointerup='end'
    @pointercancel='end'
    @contextmenu.prevent
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
  background: var(--bg-surface, #1a1a2e)
  outline: 1px solid rgba(0, 0, 0, 0.5)
  touch-action: none
  cursor: crosshair
  overflow: hidden
  transition: outline 0.1s

  &.touching
    outline: 2px solid var(--accent, #4a9eff)
    box-shadow: 0 0 8px color-mix(in srgb, var(--accent, #4a9eff) 40%, transparent)

.grid
  position: absolute
  inset: 0
  background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
  background-size: 25% 25%

.indicator
  position: absolute
  width: 20px
  height: 20px
  background: var(--accent, #4a9eff)
  border-radius: 50%
  transform: translate(-50%, -50%)
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent, #4a9eff) 50%, transparent)
  pointer-events: none

.label
  position: absolute
  top: 6px
  left: 0
  right: 0
  text-align: center
  font-size: 0.75rem
  font-weight: 600
  color: white
  text-shadow: 0 1px 2px black
  pointer-events: none

.values
  position: absolute
  bottom: 6px
  left: 0
  right: 0
  text-align: center
  font-size: 0.625rem
  font-weight: 500
  color: white
  text-shadow: 0 1px 2px black
  pointer-events: none
</style>
