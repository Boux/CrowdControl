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
    local: {},
    guides: []
  }),
  computed: {
    host() { return useHostStore() },
    seatId() { return this.$route.params.seatId },
    seat() { return this.host.seats.find(s => s.id === this.seatId) },
    controls() { return this.seat?.controls || [] },
    selectedControl() { return this.controls.find(c => c.id === this.selectedId) },
    showMinMax() { return ["xy-pad", "fader"].includes(this.selectedControl?.type) },
    showOrientation() { return this.selectedControl?.type === "fader" },
    showOnOff() { return ["button", "toggle"].includes(this.selectedControl?.type) },
    aspectW() { return this.seat?.aspectW || 9 },
    aspectH() { return this.seat?.aspectH || 19.5 },
    canvasStyle() {
      return { aspectRatio: `${this.aspectW} / ${this.aspectH}`, height: `min(100cqh, calc(100cqw * ${this.aspectH} / ${this.aspectW}))` }
    }
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
  mounted() {
    document.addEventListener("keydown", this.onKeydown)
  },
  beforeUnmount() {
    document.removeEventListener("keydown", this.onKeydown)
  },
  methods: {
    saveName() {
      this.host.updateSeat(this.seatId, { name: this.name, color: this.color })
      this.editingName = false
    },
    setAspect(w, h) {
      if (w < 1 || h < 1) return
      this.host.updateSeat(this.seatId, { aspectW: w, aspectH: h })
    },
    nextMidiSlot(extra) {
      const used = new Set()
      for (const seat of this.host.seats)
        for (const c of seat.controls) {
          if (c.midiCC !== undefined) used.add(`${c.midiChannel || 0}:${c.midiCC}`)
          if (c.midiCCY !== undefined) used.add(`${c.midiChannel || 0}:${c.midiCCY}`)
        }
      if (extra) extra.forEach(k => used.add(k))
      for (let ch = 0; ch < 16; ch++)
        for (let cc = 0; cc < 128; cc++)
          if (!used.has(`${ch}:${cc}`)) return { ch, cc }
      return { ch: 0, cc: 0 }
    },
    addControl(type) {
      const baseName = this.seat.name.toLowerCase().replace(/\s+/g, "_")
      const count = this.controls.filter(c => c.type === type).length + 1
      const slot = this.nextMidiSlot()
      const midi = { midiChannel: slot.ch, midiCC: slot.cc }
      if (type === "xy-pad") {
        const slotY = this.nextMidiSlot([`${slot.ch}:${slot.cc}`])
        midi.midiCCY = slotY.cc === slot.cc + 1 && slotY.ch === slot.ch ? slotY.cc : slotY.cc
      }
      const defaults = {
        "xy-pad": { label: "XY Pad", oscAddress: `/${baseName}/xy${count}`, min: 0, max: 1, value: 0.5, valueY: 0.5 },
        "fader": { label: "Fader", oscAddress: `/${baseName}/fader${count}`, min: 0, max: 1, value: 0, orientation: "vertical" },
        "button": { label: "Button", oscAddress: `/${baseName}/button${count}`, onValue: 1, offValue: 0 },
        "toggle": { label: "Toggle", oscAddress: `/${baseName}/toggle${count}`, onValue: 1, offValue: 0, value: 0 }
      }
      this.selectedId = this.host.addControl(this.seatId, { type, ...defaults[type], ...layoutDefaults[type], ...midi })
    },
    onKeydown(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return
      if (e.key === "Delete" || e.key === "Backspace") this.deleteControl()
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
    controlStyle(c, i) {
      const d = layoutDefaults[c.type]
      return {
        position: "absolute",
        left: `${c.x ?? d.x}%`,
        top: `${c.y ?? d.y}%`,
        width: `${c.w ?? d.w}%`,
        height: `${c.h ?? d.h}%`,
        zIndex: i
      }
    },
    selectControl(c, e) {
      e.stopPropagation()
      this.selectedId = c.id
    },
    clearSelection() {
      this.selectedId = null
    },

    // Snap
    getSnapEdges(exclude) {
      const edges = { x: [0, 100], y: [0, 100] }
      for (const c of this.controls) {
        if (c.id === exclude) continue
        const d = layoutDefaults[c.type]
        const x = c.x ?? d.x, y = c.y ?? d.y, w = c.w ?? d.w, h = c.h ?? d.h
        edges.x.push(x, x + w)
        edges.y.push(y, y + h)
      }
      return edges
    },
    snapValue(val, targets, threshold) {
      let best = null, bestDist = threshold
      for (const t of targets) {
        const dist = Math.abs(val - t)
        if (dist < bestDist) { best = t; bestDist = dist }
      }
      return best
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
      let x = Math.max(0, Math.min(100 - w, d.startX + dx))
      let y = Math.max(0, Math.min(100 - h, d.startY + dy))
      if (!e.shiftKey) {
        const edges = this.getSnapEdges(d.control.id)
        const th = 2
        const guides = []
        const sL = this.snapValue(x, edges.x, th)
        const sR = this.snapValue(x + w, edges.x, th)
        const sT = this.snapValue(y, edges.y, th)
        const sB = this.snapValue(y + h, edges.y, th)
        if (sL !== null && (sR === null || Math.abs(sL - x) <= Math.abs(sR - (x + w)))) {
          x = sL; guides.push({ axis: "x", pos: sL })
        } else if (sR !== null) {
          x = sR - w; guides.push({ axis: "x", pos: sR })
        }
        if (sT !== null && (sB === null || Math.abs(sT - y) <= Math.abs(sB - (y + h)))) {
          y = sT; guides.push({ axis: "y", pos: sT })
        } else if (sB !== null) {
          y = sB - h; guides.push({ axis: "y", pos: sB })
        }
        this.guides = guides
      } else {
        this.guides = []
      }
      d.control.x = x
      d.control.y = y
    },
    onDragEnd() {
      document.removeEventListener("mousemove", this.onDragMove)
      document.removeEventListener("mouseup", this.onDragEnd)
      this.dragging = null
      this.guides = []
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
      const edges = !e.shiftKey ? this.getSnapEdges(c.id) : null
      const th = 2
      const guides = []
      const snap = (v, axis) => {
        if (!edges) return v
        const s = this.snapValue(v, edges[axis], th)
        if (s !== null) { guides.push({ axis, pos: s }); return s }
        return v
      }

      if (r.handle === "se") {
        c.w = Math.max(10, snap(r.startX + r.startW + dx, "x") - (c.x ?? r.startX))
        c.h = Math.max(5, snap(r.startY + r.startH + dy, "y") - (c.y ?? r.startY))
      } else if (r.handle === "sw") {
        const newLeft = snap(r.startX + dx, "x")
        c.w = Math.max(10, r.startX + r.startW - newLeft)
        c.x = r.startX + r.startW - c.w
        c.h = Math.max(5, snap(r.startY + r.startH + dy, "y") - (c.y ?? r.startY))
      } else if (r.handle === "ne") {
        c.w = Math.max(10, snap(r.startX + r.startW + dx, "x") - (c.x ?? r.startX))
        const newTop = snap(r.startY + dy, "y")
        c.h = Math.max(5, r.startY + r.startH - newTop)
        c.y = r.startY + r.startH - c.h
      } else if (r.handle === "nw") {
        const newLeft = snap(r.startX + dx, "x")
        c.w = Math.max(10, r.startX + r.startW - newLeft)
        c.x = r.startX + r.startW - c.w
        const newTop = snap(r.startY + dy, "y")
        c.h = Math.max(5, r.startY + r.startH - newTop)
        c.y = r.startY + r.startH - c.h
      }
      this.guides = guides
    },
    onResizeEnd() {
      document.removeEventListener("mousemove", this.onResizeMove)
      document.removeEventListener("mouseup", this.onResizeEnd)
      this.resizing = null
      this.guides = []
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
        <div ref='canvas' class='canvas' :style='canvasStyle' @click='clearSelection'>
          <div
            v-for='(c, i) in controls'
            :key='c.id'
            class='canvas-control'
            :class='{ selected: c.id === selectedId }'
            :style='controlStyle(c, i)'
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
          <div v-for='(g, gi) in guides' :key='"guide-" + gi' class='guide' :class='g.axis' :style='g.axis === "x" ? { left: g.pos + "%" } : { top: g.pos + "%" }'></div>
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

          <div class='section-label'>MIDI</div>
          <table>
            <tr>
              <td>Ch</td>
              <td colspan='3'><input type='number' min='1' max='16' step='1' :value='(local.midiChannel || 0) + 1' @change='local.midiChannel = +$event.target.value - 1' /></td>
            </tr>
            <tr v-if='selectedControl.type === "xy-pad"'>
              <td>CC X</td>
              <td><input v-model.number='local.midiCC' type='number' min='0' max='127' step='1' /></td>
              <td>CC Y</td>
              <td><input v-model.number='local.midiCCY' type='number' min='0' max='127' step='1' /></td>
            </tr>
            <tr v-else>
              <td>CC</td>
              <td colspan='3'><input v-model.number='local.midiCC' type='number' min='0' max='127' step='1' /></td>
            </tr>
          </table>

          <button class='delete' @click='deleteControl'>Delete Control</button>
        </template>
        <div v-else class='seat-settings'>
          <h3>Canvas Size</h3>
          <div class='presets'>
            <button :class='{ active: aspectW === 9 && aspectH === 19.5 }' @click='setAspect(9, 19.5)'>Phone</button>
            <button :class='{ active: aspectW === 9 && aspectH === 16 }' @click='setAspect(9, 16)'>Wide</button>
            <button :class='{ active: aspectW === 3 && aspectH === 4 }' @click='setAspect(3, 4)'>Tablet</button>
            <button :class='{ active: aspectW === 1 && aspectH === 1 }' @click='setAspect(1, 1)'>Square</button>
          </div>
          <table>
            <tr>
              <td>W</td>
              <td><input :value='aspectW' type='number' step='0.5' min='1' @change='setAspect(+$event.target.value, aspectH)' /></td>
              <td>H</td>
              <td><input :value='aspectH' type='number' step='0.5' min='1' @change='setAspect(aspectW, +$event.target.value)' /></td>
            </tr>
          </table>
          <div class='no-selection'>Click a control to edit its settings</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.editor
  padding: 1.5rem
  max-width: 1100px
  margin: 0 auto
  height: 100dvh
  display: flex
  flex-direction: column
  box-sizing: border-box

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
  flex: 1
  min-height: 0

.canvas-wrap
  flex: 1
  display: flex
  justify-content: center
  align-items: center
  align-self: stretch
  container-type: size

.canvas
  position: relative
  background: #0d0d1a
  border: 2px solid #333
  border-radius: 24px
  overflow: hidden

.guide
  position: absolute
  z-index: 50
  pointer-events: none

  &.x
    top: 0
    bottom: 0
    width: 1px
    background: #4a9eff88

  &.y
    left: 0
    right: 0
    height: 1px
    background: #4a9eff88

.canvas-control
  position: absolute
  border: 2px solid transparent
  border-radius: 6px
  cursor: move
  box-sizing: border-box

  &.selected
    border-color: #4a9eff
    z-index: 100 !important

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

.seat-settings
  h3
    font-size: 0.875rem
    margin: 0 0 0.5rem
    color: #4a9eff

.presets
  display: flex
  gap: 0.25rem
  margin-bottom: 0.5rem

  button
    flex: 1
    padding: 0.3rem
    background: #0d0d1a
    border: 1px solid #333
    border-radius: 3px
    color: #888
    font-size: 0.65rem
    cursor: pointer

    &:hover
      border-color: #4a9eff
      color: white

    &.active
      border-color: #4a9eff
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
