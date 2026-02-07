<script>
import { useSessionStore } from "../../stores/session"
import XYPad from "../../components/controls/XYPad.vue"
import Fader from "../../components/controls/Fader.vue"
import OscButton from "../../components/controls/OscButton.vue"
import Toggle from "../../components/controls/Toggle.vue"

const layoutDefaults = {
  "xy-pad": { x: 10, y: 30, w: 80, h: 40 },
  "fader": { x: 35, y: 20, w: 30, h: 60 },
  "button": { x: 30, y: 42, w: 40, h: 15 },
  "toggle": { x: 30, y: 44, w: 40, h: 12 }
}

export default {
  name: "SeatView",
  components: { XYPad, Fader, OscButton, Toggle },
  computed: {
    session() { return useSessionStore() },
    seat() { return this.session.currentSeat },
    controls() { return this.session.controls }
  },
  watch: {
    seat(val) {
      if (!val) this.leave()
    }
  },
  mounted() {
    window.addEventListener("beforeunload", this.handleUnload)
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.handleUnload)
    this.session.releaseSeat()
  },
  methods: {
    handleUnload() {
      this.session.releaseSeat()
    },
    leave() {
      this.$router.push(`/session/${this.session.session.id}`)
    },
    onChange(control, value, valueY) {
      this.session.sendControl(control.id, value, valueY)
    },
    controlStyle(c) {
      const d = layoutDefaults[c.type] || { x: 10, y: 10, w: 80, h: 20 }
      return {
        position: "absolute",
        left: `${c.x ?? d.x}%`,
        top: `${c.y ?? d.y}%`,
        width: `${c.w ?? d.w}%`,
        height: `${c.h ?? d.h}%`
      }
    }
  }
}
</script>

<template>
  <div class='seat-view'>
    <header v-if='seat' :style='{ borderColor: seat.color }'>
      <button class='back' @click='leave'>&larr;</button>
      <div class='badge' :style='{ background: seat.color }'>{{ seat.name }}</div>
    </header>

    <div v-if='!controls.length' class='empty'>No controls configured yet.</div>

    <div class='controls'>
      <div v-for='c in controls' :key='c.id' class='control' :style='controlStyle(c)'>
        <XYPad
          v-if='c.type === "xy-pad"'
          :label='c.label'
          :value-x='c.value'
          :value-y='c.valueY ?? 0.5'
          :min='c.min'
          :max='c.max'
          @change='({ x, y }) => onChange(c, x, y)'
        />
        <Fader
          v-else-if='c.type === "fader"'
          :label='c.label'
          :value='c.value'
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
          :value='c.value'
          :on-value='c.onValue'
          :off-value='c.offValue'
          @change='v => onChange(c, v)'
        />
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.seat-view
  height: 100vh
  height: 100dvh
  display: flex
  flex-direction: column
  padding: 0
  overflow: hidden

header
  display: flex
  align-items: center
  gap: 1rem
  padding: 0.75rem 1rem
  border-bottom: 2px solid

.back
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  cursor: pointer

.badge
  padding: 0.5rem 1rem
  border-radius: 6px
  font-weight: 600
  color: white

.empty
  text-align: center
  color: #666
  padding: 2rem
  background: #1a1a2e
  border-radius: 8px
  margin: 1rem

.controls
  position: relative
  flex: 1
  min-height: 0
  width: min(100%, calc((100dvh - 60px) * 9 / 19.5))
  align-self: center

  .control
    position: absolute

    > *
      width: 100%
      height: 100%
</style>
