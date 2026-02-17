<script>
import { useHostStore } from "../../stores/host"
import { layoutDefaults, controlBounds } from "../../utils/layout.js"
import CanvasEditor from "../../components/editor/CanvasEditor.vue"
import ControlPalette from "../../components/editor/ControlPalette.vue"
import ControlSettings from "../../components/editor/ControlSettings.vue"
import SeatSettings from "../../components/editor/SeatSettings.vue"
import XYPad from "../../components/controls/XYPad.vue"
import Fader from "../../components/controls/Fader.vue"
import OscButton from "../../components/controls/OscButton.vue"
import Toggle from "../../components/controls/Toggle.vue"

export default {
  name: "SeatEditorView",
  components: { CanvasEditor, ControlPalette, ControlSettings, SeatSettings, XYPad, Fader, OscButton, Toggle },
  data: () => ({
    name: "",
    selectedIds: [],
    undoStack: [],
    redoStack: []
  }),
  computed: {
    host() { return useHostStore() },
    seatId() { return this.$route.params.seatId },
    seat() { return this.host.seats.find(s => s.id === this.seatId) },
    controls() { return this.seat?.controls || [] },
    selectedId() { return this.selectedIds[this.selectedIds.length - 1] || null },
    selectedControl() { return this.controls.find(c => c.id === this.selectedId) },
    aspectW() { return this.seat?.aspectW || 9 },
    aspectH() { return this.seat?.aspectH || 19.5 },
    canvasStyle() {
      const style = { aspectRatio: `${this.aspectW} / ${this.aspectH}`, height: `min(100cqh, calc(100cqw * ${this.aspectH} / ${this.aspectW}))` }
      if (this.seat?.color) style["--accent"] = this.seat.color
      return style
    }
  },
  watch: {
    seat: {
      immediate: true,
      handler(s) {
        if (!s) return
        this.name = s.name
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
    pushHistory() {
      const snapshot = JSON.stringify(this.controls)
      const top = this.undoStack[this.undoStack.length - 1]
      if (top === snapshot) return
      this.undoStack.push(snapshot)
      this.redoStack = []
    },
    restoreSnapshot(snapshot) {
      const parsed = JSON.parse(snapshot)
      this.seat.controls.splice(0, this.seat.controls.length, ...parsed)
      const ids = new Set(parsed.map(c => c.id))
      this.selectedIds = this.selectedIds.filter(id => ids.has(id))
      this.host.syncSession()
    },
    undo() {
      if (!this.undoStack.length) return
      this.redoStack.push(JSON.stringify(this.controls))
      this.restoreSnapshot(this.undoStack.pop())
    },
    redo() {
      if (!this.redoStack.length) return
      this.undoStack.push(JSON.stringify(this.controls))
      this.restoreSnapshot(this.redoStack.pop())
    },
    saveName() {
      const trimmed = this.name.trim()
      if (/[a-z0-9]/i.test(trimmed)) this.host.updateSeat(this.seatId, { name: trimmed })
      else this.name = this.seat.name
    },
    recolor(e) {
      this.host.updateSeat(this.seatId, { color: e.target.value })
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
      this.pushHistory()
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
      this.selectedIds = [this.host.addControl(this.seatId, { type, ...defaults[type], ...layoutDefaults[type], ...midi })]
    },
    onKeydown(e) {
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === "z" && !e.shiftKey) { e.preventDefault(); this.undo(); return }
      if (mod && key === "z" && e.shiftKey) { e.preventDefault(); this.redo(); return }
      if (mod && key === "y") { e.preventDefault(); this.redo(); return }
      if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return
      if (e.key === "Delete" || e.key === "Backspace") this.deleteControl()
    },
    cloneControl(src) {
      const copy = JSON.parse(JSON.stringify(src))
      delete copy.id
      if (copy.oscAddress) {
        const used = new Set()
        for (const s of this.host.seats)
          for (const c of s.controls)
            if (c.oscAddress) used.add(c.oscAddress)
        const base = copy.oscAddress.replace(/\d*$/, "")
        for (let n = 2; ; n++) {
          const addr = base + n
          if (!used.has(addr)) { copy.oscAddress = addr; break }
        }
      }
      const slot = this.nextMidiSlot()
      copy.midiChannel = slot.ch
      copy.midiCC = slot.cc
      if (copy.midiCCY !== undefined) {
        const slotY = this.nextMidiSlot([`${slot.ch}:${slot.cc}`])
        copy.midiCCY = slotY.cc
      }
      return copy
    },
    duplicateControl() {
      this.pushHistory()
      if (!this.selectedControl) return
      const copy = this.cloneControl(this.selectedControl)
      const b = controlBounds(copy)
      copy.x = Math.min(100 - b.w, b.x + 3)
      copy.y = Math.min(100 - b.h, b.y + 3)
      this.selectedIds = [this.host.addControl(this.seatId, copy)]
    },
    duplicateSelected() {
      const sources = this.selectedIds.map(id => this.controls.find(c => c.id === id)).filter(Boolean)
      const newIds = []
      for (const src of sources) newIds.push(this.host.addControl(this.seatId, this.cloneControl(src)))
      this.selectedIds = newIds
      return newIds
    },
    deleteControl() {
      if (!this.selectedIds.length) return
      this.pushHistory()
      const ids = [...this.selectedIds]
      this.selectedIds = []
      for (const id of ids) this.host.deleteControl(this.seatId, id)
    },
    onControlUpdate(data, isSnapshot) {
      if (isSnapshot) { this.pushHistory(); return }
      if (!data) return
      this.host.updateControl(this.seatId, this.selectedId, data)
    },
    back() {
      this.$router.push("/dashboard")
    },
    onBeforeDrag(pending) {
      this.pushHistory()
      if (!pending.ctrlHeld) return
      const origIndex = this.selectedIds.indexOf(pending.item.id)
      const newIds = this.duplicateSelected()
      if (!newIds.length) { pending.cancel(); return }
      const c = this.controls.find(ctrl => ctrl.id === newIds[origIndex >= 0 ? origIndex : 0])
      if (!c) { pending.cancel(); return }
      pending.item = c
      pending.selectedIds = newIds
    }
  }
}
</script>

<template>
  <div class='editor'>
    <header>
      <IconButton icon='arrow-left' class='back' @click='back'>Back</IconButton>
      <label class='color-pick' :style='{ background: seat?.color }'>
        <input type='color' :value='seat?.color' @input='recolor' />
      </label>
      <input
        class='name-input'
        :class='{ invalid: !/[a-z0-9]/i.test(name) }'
        v-model='name'
        type='text'
        @blur='saveName'
        @keyup.enter='$event.target.blur()'
      />
    </header>

    <ControlPalette @add='addControl' />

    <div class='layout'>
      <div class='canvas-wrap'>
        <CanvasEditor
          v-model:items='controls'
          v-model:selected='selectedIds'
          class='canvas'
          :style='canvasStyle'
          @before-drag='onBeforeDrag'
          @before-resize='pushHistory'
          @drag-end='host.syncSession()'
          @resize-end='host.syncSession()'
        >
          <template #item='{ item }'>
            <XYPad v-if='item.type === "xy-pad"' :label='item.label' :value-x='0.5' :value-y='0.5' :min='item.min' :max='item.max' />
            <Fader v-else-if='item.type === "fader"' :label='item.label' :value='0' :min='item.min' :max='item.max' :orientation='item.orientation' />
            <OscButton v-else-if='item.type === "button"' :label='item.label' />
            <Toggle v-else-if='item.type === "toggle"' :label='item.label' :value='0' :on-value='item.onValue' :off-value='item.offValue' />
          </template>
          <template #empty>Add controls above</template>
        </CanvasEditor>
      </div>

      <div class='settings'>
        <ControlSettings
          v-if='selectedControl && selectedIds.length === 1'
          :control='selectedControl'
          @update='onControlUpdate'
          @duplicate='duplicateControl'
          @delete='deleteControl'
        />
        <SeatSettings v-else-if='seat' :seat='seat' @set-aspect='setAspect' />
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

.color-pick
  width: 28px
  height: 28px
  border-radius: 6px
  flex-shrink: 0
  cursor: pointer
  position: relative

  input[type='color']
    position: absolute
    inset: 0
    opacity: 0
    width: 100%
    height: 100%
    cursor: pointer
    border: none
    padding: 0

.name-input
  flex: 1
  font-size: 1.25rem
  font-weight: 600
  padding: 0.4rem 0.6rem
  border: 1px solid transparent
  border-radius: 6px
  background: transparent
  color: white
  min-width: 0

  &:hover
    border-color: #333

  &:focus
    outline: none
    border-color: #4a9eff
    background: #1a1a2e

  &.invalid
    border-color: #e74c3c

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
  background: #0d0d1a
  border: 2px solid #333
  border-radius: 24px

.settings
  width: 260px
  flex-shrink: 0
  background: #1a1a2e
  border-radius: 8px
  padding: 0.75rem
</style>
