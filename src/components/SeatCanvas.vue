<script>
import { controlStyle } from "../utils/layout.js"
import XYPad from "./controls/XYPad.vue"
import Fader from "./controls/Fader.vue"
import OscButton from "./controls/OscButton.vue"
import Toggle from "./controls/Toggle.vue"

export default {
  name: "SeatCanvas",
  components: { XYPad, Fader, OscButton, Toggle },
  props: {
    controls: { type: Array, default: () => [] },
    accent: { type: String, default: null }
  },
  emits: ["control"],
  methods: {
    controlStyle,
    onChange(c, value, valueY) {
      this.$emit("control", c, value, valueY)
    }
  }
}
</script>

<template>
  <div class='seat-canvas' :style='accent ? { "--accent": accent } : {}'>
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
  user-select: none

  .control
    position: absolute

    > *
      width: 100%
      height: 100%
</style>
