<script>
import XYPad from "./controls/XYPad.vue"
import Fader from "./controls/Fader.vue"
import OscButton from "./controls/OscButton.vue"
import Toggle from "./controls/Toggle.vue"

const layoutDefaults = {
  "xy-pad": { x: 10, y: 30, w: 80, h: 40 },
  "fader": { x: 35, y: 20, w: 30, h: 60 },
  "button": { x: 30, y: 42, w: 40, h: 15 },
  "toggle": { x: 30, y: 44, w: 40, h: 12 }
}

export default {
  name: "SeatCanvas",
  components: { XYPad, Fader, OscButton, Toggle },
  props: {
    controls: { type: Array, default: () => [] }
  },
  emits: ["control"],
  methods: {
    controlStyle(c, i) {
      const d = layoutDefaults[c.type] || { x: 10, y: 10, w: 80, h: 20 }
      return {
        position: "absolute",
        left: `${c.x ?? d.x}%`,
        top: `${c.y ?? d.y}%`,
        width: `${c.w ?? d.w}%`,
        height: `${c.h ?? d.h}%`,
        zIndex: i
      }
    },
    onChange(c, value, valueY) {
      this.$emit("control", c, value, valueY)
    }
  }
}
</script>

<template>
  <div class='seat-canvas'>
    <div v-for='(c, i) in controls' :key='c.id' class='control' :style='controlStyle(c, i)'>
      <XYPad
        v-if='c.type === "xy-pad"'
        :label='c.label'
        :value-x='c.value ?? 0.5'
        :value-y='c.valueY ?? 0.5'
        :min='c.min'
        :max='c.max'
        @change='({ x, y }) => onChange(c, x, y)'
      />
      <Fader
        v-else-if='c.type === "fader"'
        :label='c.label'
        :value='c.value ?? 0'
        :min='c.min'
        :max='c.max'
        :orientation='c.orientation'
        @change='v => onChange(c, v)'
      />
      <OscButton
        v-else-if='c.type === "button"'
        :label='c.label'
        @press='onChange(c, c.onValue)'
        @release='onChange(c, c.offValue)'
      />
      <Toggle
        v-else-if='c.type === "toggle"'
        :label='c.label'
        :value='c.value ?? 0'
        :on-value='c.onValue'
        :off-value='c.offValue'
        @change='v => onChange(c, v)'
      />
    </div>
  </div>
</template>

<style lang='sass' scoped>
.seat-canvas
  position: relative
  width: 100%
  height: 100%

  .control
    position: absolute

    > *
      width: 100%
      height: 100%
</style>
