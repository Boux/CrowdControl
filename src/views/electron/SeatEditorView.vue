<script>
import { useHostStore } from "../../stores/host"
import ControlPalette from "../../components/editor/ControlPalette.vue"
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
  name: "SeatEditorView",
  components: { ControlPalette, XYPad, Fader, OscButton, Toggle },
  data: () => ({
    editingName: false,
    name: "",
    color: "",
    selectedId: null,
    dragging: null,
    resizing: null,
    local: {}
  }),
  computed: {
    host() { return useHostStore() },
    seatId() { return this.$route.params.seatId },
    seat() { return this.host.seats.find(s => s.id === this.seatId) },
    controls() { return this.seat?.controls || [] },
    selectedControl() { return this.controls.find(c => c.id === this.selectedId) },
    showMinMax() { return ["xy-pad", "fader"].includes(this.selectedControl?.type) },
    showOrientation() { return this.selectedControl?.type === "fader" },
    showOnOff() { return ["button", "toggle"].includes(this.selectedControl?.type) }
  },
  watch: {
    seat: {
      immediate: true,
      handler(s) {
        if (!s) return
        this.name = s.name
        this.color = s.color
      }
    },
    selectedControl: {
      deep: true,
      handler(c) {
        if (!c) return
        this._skipLocalWatch = true
        this.local = { ...c }
      }
    },
    local: {
      deep: true,
      handler() {
        if (this._skipLocalWatch) { this._skipLocalWatch = false; return }
        if (!this.selectedControl) return
        this.host.updateControl(this.seatId, this.selectedId, this.local)
      }
    }
  },
  methods: {
    saveName() {
      this.host.updateSeat(this.seatId, { name: this.name, color: this.color })
      this.editingName = false
    },
    addControl(type) {
      const baseName = this.seat.name.toLowerCase().replace(/\s+/g, "_")
      const count = this.controls.filter(c => c.type === type).length + 1
      const defaults = {
        "xy-pad": { label: "XY Pad", oscAddress: `/${baseName}/xy/${count}`, min: 0, max: 1, value: 0.5, valueY: 0.5 },
        "fader": { label: "Fader", oscAddress: `/${baseName}/fader/${count}`, min: 0, max: 1, value: 0, orientation: "vertical" },
        "button": { label: "Button", oscAddress: `/${baseName}/button/${count}`, onValue: 1, offValue: 0 },
        "toggle": { label: "Toggle", oscAddress: `/${baseName}/toggle/${count}`, onValue: 1, offValue: 0, value: 0 }
      }
      this.host.addControl(this.seatId, { type, ...defaults[type], ...layoutDefaults[type] })
    },
    deleteControl() {
      if (!this.selectedControl) return
      const id = this.selectedId
      this.selectedId = null
      this.host.deleteControl(this.seatId, id)
    },
    back() {
      this.$router.push("/dashboard")
    },
    controlStyle(c) {
      const d = layoutDefaults[c.type]
      return {
        position: "absolute",
        left: `${c.x ?? d.x}%`,
        top: `${c.y ?? d.y}%`,
        width: `${c.w ?? d.w}%`,
        height: `${c.h ?? d.h}%`
      }
    },
    selectControl(c, e) {
      e.stopPropagation()
      this.selectedId = c.id
    },
    clearSelection() {
      this.selectedId = null
    },

    // Drag
    startDrag(c, e) {
      e.preventDefault()
      e.stopPropagation()
      this.selectedId = c.id
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      this.dragging = {
        control: c,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: c.x ?? layoutDefaults[c.type].x,
        startY: c.y ?? layoutDefaults[c.type].y,
        canvasW: rect.width,
        canvasH: rect.height
      }
      document.addEventListener("mousemove", this.onDragMove)
      document.addEventListener("mouseup", this.onDragEnd)
    },
    onDragMove(e) {
      if (!this.dragging) return
      const d = this.dragging
      const dx = ((e.clientX - d.startMouseX) / d.canvasW) * 100
      const dy = ((e.clientY - d.startMouseY) / d.canvasH) * 100
      const w = d.control.w ?? layoutDefaults[d.control.type].w
      const h = d.control.h ?? layoutDefaults[d.control.type].h
      d.control.x = Math.max(0, Math.min(100 - w, d.startX + dx))
      d.control.y = Math.max(0, Math.min(100 - h, d.startY + dy))
    },
    onDragEnd() {
      document.removeEventListener("mousemove", this.onDragMove)
      document.removeEventListener("mouseup", this.onDragEnd)
      this.dragging = null
      this.host.syncSession()
    },

    // Resize
    startResize(c, handle, e) {
      e.preventDefault()
      e.stopPropagation()
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const d = layoutDefaults[c.type]
      this.resizing = {
        control: c,
        handle,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: c.x ?? d.x,
        startY: c.y ?? d.y,
        startW: c.w ?? d.w,
        startH: c.h ?? d.h,
        canvasW: rect.width,
        canvasH: rect.height
      }
      document.addEventListener("mousemove", this.onResizeMove)
      document.addEventListener("mouseup", this.onResizeEnd)
    },
    onResizeMove(e) {
      if (!this.resizing) return
      const r = this.resizing
      const c = r.control
      const dx = ((e.clientX - r.startMouseX) / r.canvasW) * 100
      const dy = ((e.clientY - r.startMouseY) / r.canvasH) * 100

      if (r.handle === "se") {
        c.w = Math.max(10, r.startW + dx)
        c.h = Math.max(5, r.startH + dy)
      } else if (r.handle === "sw") {
        const newW = Math.max(10, r.startW - dx)
        c.x = r.startX + r.startW - newW
        c.w = newW
        c.h = Math.max(5, r.startH + dy)
      } else if (r.handle === "ne") {
        c.w = Math.max(10, r.startW + dx)
        const newH = Math.max(5, r.startH - dy)
        c.y = r.startY + r.startH - newH
        c.h = newH
      } else if (r.handle === "nw") {
        const newW = Math.max(10, r.startW - dx)
        c.x = r.startX + r.startW - newW
        c.w = newW
        const newH = Math.max(5, r.startH - dy)
        c.y = r.startY + r.startH - newH
        c.h = newH
      }
    },
    onResizeEnd() {
      document.removeEventListener("mousemove", this.onResizeMove)
      document.removeEventListener("mouseup", this.onResizeEnd)
      this.resizing = null
      this.host.syncSession()
    }
  }
}
</script>

<template>
  <div class='editor'>
    <header>
      <button class='back' @click='back'>&larr; Back</button>
      <div v-if='!editingName' class='title' @click='editingName = true'>
        <div class='color' :style='{ background: seat?.color }'></div>
        <h1>{{ seat?.name }}</h1>
        <span class='hint'>Click to edit</span>
      </div>
      <div v-else class='edit-form'>
        <input v-model='name' type='text' />
        <input v-model='color' type='color' />
        <button @click='saveName'>Save</button>
        <button class='cancel' @click='editingName = false'>Cancel</button>
      </div>
    </header>

    <ControlPalette @add='addControl' />

    <div class='layout'>
      <div class='canvas-wrap'>
        <div ref='canvas' class='canvas' @click='clearSelection'>
          <div
            v-for='c in controls'
            :key='c.id'
            class='canvas-control'
            :class='{ selected: c.id === selectedId }'
            :style='controlStyle(c)'
            @mousedown='startDrag(c, $event)'
            @click='selectControl(c, $event)'
          >
            <div class='control-inner'>
              <XYPad v-if='c.type === "xy-pad"' :label='c.label' :value-x='0.5' :value-y='0.5' :min='c.min' :max='c.max' />
              <Fader v-else-if='c.type === "fader"' :label='c.label' :value='0' :min='c.min' :max='c.max' :orientation='c.orientation' />
              <OscButton v-else-if='c.type === "button"' :label='c.label' />
              <Toggle v-else-if='c.type === "toggle"' :label='c.label' :value='0' :on-value='c.onValue' :off-value='c.offValue' />
            </div>
            <template v-if='c.id === selectedId'>
              <div class='handle nw' @mousedown='startResize(c, "nw", $event)'></div>
              <div class='handle ne' @mousedown='startResize(c, "ne", $event)'></div>
              <div class='handle sw' @mousedown='startResize(c, "sw", $event)'></div>
              <div class='handle se' @mousedown='startResize(c, "se", $event)'></div>
            </template>
          </div>
          <div v-if='!controls.length' class='empty'>Add controls above</div>
        </div>
      </div>

      <div class='settings'>
        <template v-if='selectedControl'>
          <h3>{{ { "xy-pad": "XY Pad", "fader": "Fader", "button": "Button", "toggle": "Toggle" }[selectedControl.type] }}</h3>

          <div class='section-label'>Layout</div>
          <table>
            <tr>
              <td>Label</td>
              <td colspan='3'><input v-model='local.label' type='text' /></td>
            </tr>
            <tr>
              <td>X</td>
              <td><input v-model.number='local.x' type='number' step='1' /></td>
              <td>Y</td>
              <td><input v-model.number='local.y' type='number' step='1' /></td>
            </tr>
            <tr>
              <td>W</td>
              <td><input v-model.number='local.w' type='number' step='1' /></td>
              <td>H</td>
              <td><input v-model.number='local.h' type='number' step='1' /></td>
            </tr>
            <tr v-if='showOrientation'>
              <td>Orient.</td>
              <td colspan='3'>
                <select v-model='local.orientation'>
                  <option value='vertical'>Vertical</option>
                  <option value='horizontal'>Horizontal</option>
                </select>
              </td>
            </tr>
          </table>

          <div class='section-label'>OSC</div>
          <table>
            <tr>
              <td>Address</td>
              <td colspan='3'><input v-model='local.oscAddress' type='text' /></td>
            </tr>
            <tr v-if='showMinMax'>
              <td>Min</td>
              <td><input v-model.number='local.min' type='number' step='0.01' /></td>
              <td>Max</td>
              <td><input v-model.number='local.max' type='number' step='0.01' /></td>
            </tr>
            <tr v-if='showOnOff'>
              <td>On</td>
              <td><input v-model.number='local.onValue' type='number' step='0.01' /></td>
              <td>Off</td>
              <td><input v-model.number='local.offValue' type='number' step='0.01' /></td>
            </tr>
          </table>

          <button class='delete' @click='deleteControl'>Delete Control</button>
        </template>
        <div v-else class='no-selection'>Click a control to edit its settings</div>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.editor
  padding: 1.5rem
  max-width: 1100px
  margin: 0 auto

header
  display: flex
  align-items: center
  gap: 1rem
  margin-bottom: 1.5rem
  flex-wrap: wrap

.back
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  cursor: pointer

.title
  display: flex
  align-items: center
  gap: 0.75rem
  cursor: pointer
  padding: 0.5rem
  border-radius: 8px

  &:hover
    background: #1a1a2e

  h1
    font-size: 1.5rem
    margin: 0

  .hint
    font-size: 0.75rem
    color: #666

.color
  width: 24px
  height: 24px
  border-radius: 4px

.edit-form
  display: flex
  gap: 0.5rem

  input[type='text']
    padding: 0.5rem
    border: 1px solid #333
    border-radius: 4px
    background: #1a1a2e
    color: white

  input[type='color']
    width: 40px
    border: none
    cursor: pointer

  button
    padding: 0.5rem 1rem
    border: none
    border-radius: 4px
    cursor: pointer
    background: #4a9eff
    color: white

    &.cancel
      background: #333

.layout
  display: flex
  gap: 1.5rem
  margin-top: 1.5rem
  align-items: flex-start

.canvas-wrap
  flex: 1
  display: flex
  justify-content: center

.canvas
  position: relative
  aspect-ratio: 9 / 19.5
  max-height: calc(100vh - 220px)
  width: 100%
  max-width: 360px
  background: #0d0d1a
  border: 2px solid #333
  border-radius: 24px
  overflow: hidden

.canvas-control
  position: absolute
  border: 2px solid transparent
  border-radius: 6px
  cursor: move
  box-sizing: border-box

  &.selected
    border-color: #4a9eff
    z-index: 10

.control-inner
  width: 100%
  height: 100%
  pointer-events: none
  overflow: hidden
  border-radius: 4px

.handle
  position: absolute
  width: 12px
  height: 12px
  background: #4a9eff
  border: 2px solid #fff
  border-radius: 2px
  z-index: 11

  &.nw
    top: -6px
    left: -6px
    cursor: nw-resize

  &.ne
    top: -6px
    right: -6px
    cursor: ne-resize

  &.sw
    bottom: -6px
    left: -6px
    cursor: sw-resize

  &.se
    bottom: -6px
    right: -6px
    cursor: se-resize

.empty
  position: absolute
  inset: 0
  display: flex
  align-items: center
  justify-content: center
  color: #444
  font-size: 0.875rem

.settings
  width: 260px
  flex-shrink: 0
  background: #1a1a2e
  border-radius: 8px
  padding: 0.75rem

  h3
    font-size: 0.875rem
    margin: 0 0 0.5rem
    color: #4a9eff

.no-selection
  color: #555
  font-size: 0.875rem
  text-align: center
  padding: 2rem 0

.section-label
  font-size: 0.625rem
  text-transform: uppercase
  color: #555
  letter-spacing: 0.05em
  padding: 0.5rem 0 0.25rem

table
  width: 100%
  border-collapse: collapse

  td
    padding: 2px
    font-size: 0.75rem
    color: #888
    vertical-align: middle
    white-space: nowrap

    &:first-child, &:nth-child(3)
      width: 1px
      padding-right: 6px

  input, select
    width: 100%
    padding: 4px 6px
    border: 1px solid #333
    border-radius: 3px
    background: #0d0d1a
    color: white
    font-size: 0.75rem
    min-width: 0

    &:focus
      outline: none
      border-color: #4a9eff

.delete
  width: 100%
  margin-top: 0.75rem
  padding: 0.4rem
  background: transparent
  border: 1px solid #e74c3c33
  border-radius: 4px
  color: #e74c3c
  font-size: 0.75rem
  cursor: pointer

  &:hover
    background: #e74c3c
    color: white
</style>
