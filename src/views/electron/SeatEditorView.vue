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
    name: "",
    selectedIds: [],
    boxSelect: null,
    dragPending: null,
    dragging: null,
    resizing: null,
    local: {},
    guides: [],
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
    showMinMax() { return ["xy-pad", "fader"].includes(this.selectedControl?.type) },
    showOrientation() { return this.selectedControl?.type === "fader" },
    showOnOff() { return ["button", "toggle"].includes(this.selectedControl?.type) },
    aspectW() { return this.seat?.aspectW || 9 },
    aspectH() { return this.seat?.aspectH || 19.5 },
    canvasStyle() {
      const style = { aspectRatio: `${this.aspectW} / ${this.aspectH}`, height: `min(100cqh, calc(100cqw * ${this.aspectH} / ${this.aspectW}))` }
      if (this.seat?.color) style["--accent"] = this.seat.color
      return style
    },
    selectionBounds() {
      if (this.selectedIds.length < 2) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const id of this.selectedIds) {
        const c = this.controls.find(ctrl => ctrl.id === id)
        if (!c) continue
        const d = layoutDefaults[c.type]
        minX = Math.min(minX, c.x ?? d.x)
        minY = Math.min(minY, c.y ?? d.y)
        maxX = Math.max(maxX, (c.x ?? d.x) + (c.w ?? d.w))
        maxY = Math.max(maxY, (c.y ?? d.y) + (c.h ?? d.h))
      }
      if (minX === Infinity) return null
      return { x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    },
    boxSelectStyle() {
      if (!this.boxSelect) return null
      const b = this.boxSelect
      return {
        left: Math.min(b.startX, b.currentX) + "%",
        top: Math.min(b.startY, b.currentY) + "%",
        width: Math.abs(b.currentX - b.startX) + "%",
        height: Math.abs(b.currentY - b.startY) + "%"
      }
    }
  },
  watch: {
    seat: {
      immediate: true,
      handler(s) {
        if (!s) return
        this.name = s.name
      }
    },
    selectedControl: {
      deep: true,
      handler(c) {
        if (!c) return
        this._skipLocalWatch = true
        this._editSnapshotSaved = false
        this.local = { ...c }
      }
    },
    local: {
      deep: true,
      handler() {
        if (this._skipLocalWatch) { this._skipLocalWatch = false; return }
        if (!this.selectedControl) return
        if (!this._editSnapshotSaved) { this.pushHistory(); this._editSnapshotSaved = true }
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
    pushHistory() {
      const snapshot = JSON.stringify(this.controls)
      const top = this.undoStack[this.undoStack.length - 1]
      if (top === snapshot) return
      this.undoStack.push(snapshot)
      this.redoStack = []
    },
    restoreSnapshot(snapshot) {
      this._skipLocalWatch = true
      this._editSnapshotSaved = true
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
      const d = layoutDefaults[copy.type]
      copy.x = Math.min(100 - (copy.w ?? d.w), (copy.x ?? d.x) + 3)
      copy.y = Math.min(100 - (copy.h ?? d.h), (copy.y ?? d.y) + 3)
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
    // Box select
    onCanvasMousedown(e) {
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      this.boxSelect = {
        startX: ((e.clientX - rect.left) / rect.width) * 100,
        startY: ((e.clientY - rect.top) / rect.height) * 100,
        currentX: ((e.clientX - rect.left) / rect.width) * 100,
        currentY: ((e.clientY - rect.top) / rect.height) * 100,
        shiftHeld: e.shiftKey || e.ctrlKey || e.metaKey
      }
      document.addEventListener("mousemove", this.onBoxSelectMove)
      document.addEventListener("mouseup", this.onBoxSelectEnd)
    },
    onBoxSelectMove(e) {
      if (!this.boxSelect) return
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      this.boxSelect.currentX = ((e.clientX - rect.left) / rect.width) * 100
      this.boxSelect.currentY = ((e.clientY - rect.top) / rect.height) * 100
    },
    onBoxSelectEnd() {
      document.removeEventListener("mousemove", this.onBoxSelectMove)
      document.removeEventListener("mouseup", this.onBoxSelectEnd)
      if (!this.boxSelect) return
      const b = this.boxSelect
      const bx = Math.min(b.startX, b.currentX)
      const by = Math.min(b.startY, b.currentY)
      const bw = Math.abs(b.currentX - b.startX)
      const bh = Math.abs(b.currentY - b.startY)
      if (bw < 1 && bh < 1) {
        if (!b.shiftHeld) this.selectedIds = []
        this.boxSelect = null
        return
      }
      const hit = []
      for (const c of this.controls) {
        const d = layoutDefaults[c.type]
        const cx = c.x ?? d.x, cy = c.y ?? d.y, cw = c.w ?? d.w, ch = c.h ?? d.h
        if (cx < bx + bw && cx + cw > bx && cy < by + bh && cy + ch > by) hit.push(c.id)
      }
      if (b.shiftHeld) {
        const existing = new Set(this.selectedIds)
        hit.forEach(id => existing.add(id))
        this.selectedIds = [...existing]
      } else {
        this.selectedIds = hit
      }
      this.boxSelect = null
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
      const mod = e.shiftKey || e.ctrlKey || e.metaKey
      const wasSelected = this.selectedIds.includes(c.id)
      if (mod) {
        if (!wasSelected) this.selectedIds = [...this.selectedIds, c.id]
      } else if (!wasSelected) {
        this.selectedIds = [c.id]
      }
      this.dragPending = {
        control: c,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        ctrlHeld: e.ctrlKey || e.metaKey,
        mod,
        wasSelected
      }
      document.addEventListener("mousemove", this.onDragMove)
      document.addEventListener("mouseup", this.onDragEnd)
    },
    commitDrag() {
      const p = this.dragPending
      this.pushHistory()
      let c = p.control
      if (p.ctrlHeld) {
        const origIndex = this.selectedIds.indexOf(p.control.id)
        const newIds = this.duplicateSelected()
        if (!newIds.length) { this.dragPending = null; return }
        c = this.controls.find(ctrl => ctrl.id === newIds[origIndex >= 0 ? origIndex : 0])
        if (!c) { this.dragPending = null; return }
      }
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const others = []
      for (const id of this.selectedIds) {
        const ctrl = this.controls.find(ct => ct.id === id)
        if (!ctrl || ctrl.id === c.id) continue
        const d = layoutDefaults[ctrl.type]
        others.push({ control: ctrl, startX: ctrl.x ?? d.x, startY: ctrl.y ?? d.y })
      }
      this.dragging = {
        control: c,
        others,
        startMouseX: p.startMouseX,
        startMouseY: p.startMouseY,
        startX: c.x ?? layoutDefaults[c.type].x,
        startY: c.y ?? layoutDefaults[c.type].y,
        canvasW: rect.width,
        canvasH: rect.height
      }
      this.dragPending = null
    },
    onDragMove(e) {
      if (this.dragPending && !this.dragging) {
        const px = e.clientX - this.dragPending.startMouseX
        const py = e.clientY - this.dragPending.startMouseY
        if (px * px + py * py < 25) return
        this.commitDrag()
      }
      if (!this.dragging) return
      const d = this.dragging
      const rawDx = ((e.clientX - d.startMouseX) / d.canvasW) * 100
      const rawDy = ((e.clientY - d.startMouseY) / d.canvasH) * 100

      // Constrain delta so no selected control leaves canvas
      const all = [{ startX: d.startX, startY: d.startY, control: d.control }, ...d.others]
      let minDx = -Infinity, maxDx = Infinity, minDy = -Infinity, maxDy = Infinity
      for (const item of all) {
        const w = item.control.w ?? layoutDefaults[item.control.type].w
        const h = item.control.h ?? layoutDefaults[item.control.type].h
        minDx = Math.max(minDx, -item.startX)
        maxDx = Math.min(maxDx, 100 - w - item.startX)
        minDy = Math.max(minDy, -item.startY)
        maxDy = Math.min(maxDy, 100 - h - item.startY)
      }
      let dx = Math.max(minDx, Math.min(maxDx, rawDx))
      let dy = Math.max(minDy, Math.min(maxDy, rawDy))

      // Snap primary control, exclude all selected
      const w = d.control.w ?? layoutDefaults[d.control.type].w
      const h = d.control.h ?? layoutDefaults[d.control.type].h
      if (!e.shiftKey) {
        const excludeIds = new Set(this.selectedIds)
        const edges = { x: [0, 100], y: [0, 100] }
        for (const c of this.controls) {
          if (excludeIds.has(c.id)) continue
          const def = layoutDefaults[c.type]
          edges.x.push((c.x ?? def.x), (c.x ?? def.x) + (c.w ?? def.w))
          edges.y.push((c.y ?? def.y), (c.y ?? def.y) + (c.h ?? def.h))
        }
        const th = 2
        const guides = []
        const x = d.startX + dx, y = d.startY + dy
        const sL = this.snapValue(x, edges.x, th)
        const sR = this.snapValue(x + w, edges.x, th)
        const sT = this.snapValue(y, edges.y, th)
        const sB = this.snapValue(y + h, edges.y, th)
        if (sL !== null && (sR === null || Math.abs(sL - x) <= Math.abs(sR - (x + w)))) {
          dx = sL - d.startX; guides.push({ axis: "x", pos: sL })
        } else if (sR !== null) {
          dx = sR - w - d.startX; guides.push({ axis: "x", pos: sR })
        }
        if (sT !== null && (sB === null || Math.abs(sT - y) <= Math.abs(sB - (y + h)))) {
          dy = sT - d.startY; guides.push({ axis: "y", pos: sT })
        } else if (sB !== null) {
          dy = sB - h - d.startY; guides.push({ axis: "y", pos: sB })
        }
        dx = Math.max(minDx, Math.min(maxDx, dx))
        dy = Math.max(minDy, Math.min(maxDy, dy))
        this.guides = guides
      } else {
        this.guides = []
      }

      // Apply delta to all selected
      d.control.x = d.startX + dx
      d.control.y = d.startY + dy
      for (const o of d.others) {
        o.control.x = o.startX + dx
        o.control.y = o.startY + dy
      }
    },
    onDragEnd() {
      document.removeEventListener("mousemove", this.onDragMove)
      document.removeEventListener("mouseup", this.onDragEnd)
      if (this.dragging) {
        this.dragging = null
        this.guides = []
        this.host.syncSession()
      } else if (this.dragPending) {
        const p = this.dragPending
        if (p.mod && p.wasSelected) {
          this.selectedIds = this.selectedIds.filter(id => id !== p.control.id)
        } else if (!p.mod) {
          this.selectedIds = [p.control.id]
        }
      }
      this.dragPending = null
    },

    // Resize (single)
    startResize(c, handle, e) {
      e.preventDefault()
      e.stopPropagation()
      this.pushHistory()
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
    // Resize (group)
    startGroupResize(handle, e) {
      e.preventDefault()
      e.stopPropagation()
      this.pushHistory()
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const bounds = this.selectionBounds
      const items = []
      for (const id of this.selectedIds) {
        const c = this.controls.find(ctrl => ctrl.id === id)
        if (!c) continue
        const d = layoutDefaults[c.type]
        items.push({ control: c, startX: c.x ?? d.x, startY: c.y ?? d.y, startW: c.w ?? d.w, startH: c.h ?? d.h })
      }
      this.resizing = {
        group: true, handle, items,
        startMouseX: e.clientX, startMouseY: e.clientY,
        boundsX: bounds.x, boundsY: bounds.y, boundsW: bounds.w, boundsH: bounds.h,
        canvasW: rect.width, canvasH: rect.height
      }
      document.addEventListener("mousemove", this.onResizeMove)
      document.addEventListener("mouseup", this.onResizeEnd)
    },
    onGroupResizeMove(e) {
      const r = this.resizing
      const dx = ((e.clientX - r.startMouseX) / r.canvasW) * 100
      const dy = ((e.clientY - r.startMouseY) / r.canvasH) * 100
      let newX = r.boundsX, newY = r.boundsY, newW = r.boundsW, newH = r.boundsH

      if (r.handle === "se") {
        newW = r.boundsW + dx
        newH = r.boundsH + dy
      } else if (r.handle === "sw") {
        const right = r.boundsX + r.boundsW
        newX = r.boundsX + dx
        newW = right - newX
        newH = r.boundsH + dy
      } else if (r.handle === "ne") {
        newW = r.boundsW + dx
        const bottom = r.boundsY + r.boundsH
        newY = r.boundsY + dy
        newH = bottom - newY
      } else if (r.handle === "nw") {
        const right = r.boundsX + r.boundsW
        newX = r.boundsX + dx
        newW = right - newX
        const bottom = r.boundsY + r.boundsH
        newY = r.boundsY + dy
        newH = bottom - newY
      }

      newW = Math.max(10, newW)
      newH = Math.max(5, newH)
      newX = Math.max(0, Math.min(100 - newW, newX))
      newY = Math.max(0, Math.min(100 - newH, newY))

      const scaleX = newW / r.boundsW
      const scaleY = newH / r.boundsH
      for (const item of r.items) {
        item.control.x = newX + (item.startX - r.boundsX) * scaleX
        item.control.y = newY + (item.startY - r.boundsY) * scaleY
        item.control.w = item.startW * scaleX
        item.control.h = item.startH * scaleY
      }
    },
    onResizeMove(e) {
      if (!this.resizing) return
      if (this.resizing.group) return this.onGroupResizeMove(e)
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
        <div ref='canvas' class='canvas' :style='canvasStyle' @mousedown='onCanvasMousedown'>
          <div
            v-for='(c, i) in controls'
            :key='c.id'
            class='canvas-control'
            :class='{ selected: selectedIds.includes(c.id) }'
            :style='controlStyle(c, i)'
            @mousedown='startDrag(c, $event)'
            @click.stop
          >
            <div class='control-inner'>
              <XYPad v-if='c.type === "xy-pad"' :label='c.label' :value-x='0.5' :value-y='0.5' :min='c.min' :max='c.max' />
              <Fader v-else-if='c.type === "fader"' :label='c.label' :value='0' :min='c.min' :max='c.max' :orientation='c.orientation' />
              <OscButton v-else-if='c.type === "button"' :label='c.label' />
              <Toggle v-else-if='c.type === "toggle"' :label='c.label' :value='0' :on-value='c.onValue' :off-value='c.offValue' />
            </div>
            <template v-if='selectedIds.length === 1 && c.id === selectedId'>
              <div class='handle nw' @mousedown='startResize(c, "nw", $event)'></div>
              <div class='handle ne' @mousedown='startResize(c, "ne", $event)'></div>
              <div class='handle sw' @mousedown='startResize(c, "sw", $event)'></div>
              <div class='handle se' @mousedown='startResize(c, "se", $event)'></div>
            </template>
          </div>
          <div v-if='selectionBounds' class='selection-bounds' :style='{ left: selectionBounds.x + "%", top: selectionBounds.y + "%", width: selectionBounds.w + "%", height: selectionBounds.h + "%" }'>
            <div class='handle nw' @mousedown='startGroupResize("nw", $event)'></div>
            <div class='handle ne' @mousedown='startGroupResize("ne", $event)'></div>
            <div class='handle sw' @mousedown='startGroupResize("sw", $event)'></div>
            <div class='handle se' @mousedown='startGroupResize("se", $event)'></div>
          </div>
          <div v-for='(g, gi) in guides' :key='"guide-" + gi' class='guide' :class='g.axis' :style='g.axis === "x" ? { left: g.pos + "%" } : { top: g.pos + "%" }'></div>
          <div v-if='boxSelectStyle' class='box-select' :style='boxSelectStyle'></div>
          <div v-if='!controls.length' class='empty'>Add controls above</div>
        </div>
      </div>

      <div class='settings'>
        <template v-if='selectedControl && selectedIds.length === 1'>
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

          <div class='control-actions'>
            <IconButton icon='copy' :icon-size='14' class='duplicate' @click='duplicateControl'>Duplicate</IconButton>
            <IconButton icon='trash-2' :icon-size='14' class='delete' @click='deleteControl'>Delete</IconButton>
          </div>
        </template>
        <div v-else class='seat-settings'>
          <h3>Canvas Size</h3>
          <div class='presets'>
            <IconButton icon='smartphone' :icon-size='12' :class='{ active: aspectW === 9 && aspectH === 19.5 }' @click='setAspect(9, 19.5)'>Phone</IconButton>
            <IconButton icon='smartphone' :icon-size='12' :class='{ active: aspectW === 9 && aspectH === 16 }' @click='setAspect(9, 16)'>Wide</IconButton>
            <IconButton icon='tablet' :icon-size='12' :class='{ active: aspectW === 3 && aspectH === 4 }' @click='setAspect(3, 4)'>Tablet</IconButton>
            <IconButton icon='square' :icon-size='12' :class='{ active: aspectW === 1 && aspectH === 1 }' @click='setAspect(1, 1)'>Square</IconButton>
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
  position: relative
  background: #0d0d1a
  border: 2px solid #333
  border-radius: 24px
  overflow: hidden
  user-select: none

.selection-bounds
  position: absolute
  border: 1px dashed #4a9eff88
  z-index: 101
  box-sizing: border-box
  pointer-events: none

  .handle
    pointer-events: auto

.box-select
  position: absolute
  border: 1px dashed #4a9eff
  background: rgba(74, 158, 255, 0.1)
  z-index: 200
  pointer-events: none

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

.control-actions
  display: flex
  gap: 0.5rem
  margin-top: 0.75rem

  button
    flex: 1
    padding: 0.4rem
    border-radius: 4px
    font-size: 0.75rem
    cursor: pointer

  .duplicate
    background: transparent
    border: 1px solid #333
    color: #888

    &:hover
      border-color: #4a9eff
      color: white

  .delete
    background: transparent
    border: 1px solid #e74c3c33
    color: #e74c3c

    &:hover
      background: #e74c3c
      color: white
</style>
