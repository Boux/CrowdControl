<script>
import { controlBounds, controlStyle } from "../../utils/layout.js"
import { snapValue, getSnapEdges } from "../../utils/snap.js"

export default {
  name: "CanvasEditor",
  props: {
    items: { type: Array, default: () => [] },
    selected: { type: Array, default: () => [] }
  },
  emits: ["update:items", "update:selected", "before-drag", "before-resize", "drag-end", "resize-end"],
  data: () => ({
    localSelected: [],
    boxSelect: null,
    dragPending: null,
    dragging: null,
    resizing: null,
    guides: []
  }),
  computed: {
    selectedId() { return this.localSelected[this.localSelected.length - 1] || null },
    selectionBounds() {
      if (this.localSelected.length < 2) return null
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
      for (const id of this.localSelected) {
        const c = this.items.find(ctrl => ctrl.id === id)
        if (!c) continue
        const b = controlBounds(c)
        minX = Math.min(minX, b.x)
        minY = Math.min(minY, b.y)
        maxX = Math.max(maxX, b.x + b.w)
        maxY = Math.max(maxY, b.y + b.h)
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
    selected: {
      immediate: true,
      handler(val) { this.localSelected = val ? [...val] : [] }
    }
  },
  methods: {
    controlStyle,
    setSelected(ids) {
      this.localSelected = ids
      this.$emit("update:selected", ids)
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
        if (!b.shiftHeld) this.setSelected([])
        this.boxSelect = null
        return
      }
      const hit = []
      for (const c of this.items) {
        const cb = controlBounds(c)
        if (cb.x < bx + bw && cb.x + cb.w > bx && cb.y < by + bh && cb.y + cb.h > by) hit.push(c.id)
      }
      if (b.shiftHeld) {
        const existing = new Set(this.localSelected)
        hit.forEach(id => existing.add(id))
        this.setSelected([...existing])
      } else {
        this.setSelected(hit)
      }
      this.boxSelect = null
    },

    // Drag
    startDrag(item, e) {
      e.preventDefault()
      e.stopPropagation()
      const mod = e.shiftKey || e.ctrlKey || e.metaKey
      const wasSelected = this.localSelected.includes(item.id)
      if (mod) {
        if (!wasSelected) this.setSelected([...this.localSelected, item.id])
      } else if (!wasSelected) {
        this.setSelected([item.id])
      }
      this.dragPending = {
        control: item,
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
      const pending = {
        item: p.control,
        ctrlHeld: p.ctrlHeld,
        selectedIds: null,
        _cancelled: false,
        cancel() { this._cancelled = true }
      }
      this.$emit("before-drag", pending)
      if (pending._cancelled) { this.dragPending = null; return }

      const c = pending.item
      const selectedIds = pending.selectedIds || this.localSelected
      if (pending.selectedIds) this.setSelected(pending.selectedIds)

      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const others = []
      for (const id of selectedIds) {
        const ctrl = this.items.find(ct => ct.id === id)
        if (!ctrl || ctrl.id === c.id) continue
        const b = controlBounds(ctrl)
        others.push({ control: ctrl, startX: b.x, startY: b.y })
      }
      const b = controlBounds(c)
      this.dragging = {
        control: c,
        others,
        startMouseX: p.startMouseX,
        startMouseY: p.startMouseY,
        startX: b.x,
        startY: b.y,
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

      const all = [{ startX: d.startX, startY: d.startY, control: d.control }, ...d.others]
      let minDx = -Infinity, maxDx = Infinity, minDy = -Infinity, maxDy = Infinity
      for (const item of all) {
        const b = controlBounds(item.control)
        minDx = Math.max(minDx, -item.startX)
        maxDx = Math.min(maxDx, 100 - b.w - item.startX)
        minDy = Math.max(minDy, -item.startY)
        maxDy = Math.min(maxDy, 100 - b.h - item.startY)
      }
      let dx = Math.max(minDx, Math.min(maxDx, rawDx))
      let dy = Math.max(minDy, Math.min(maxDy, rawDy))

      const cb = controlBounds(d.control)
      if (!e.shiftKey) {
        const excludeIds = new Set(this.localSelected)
        const edges = getSnapEdges(this.items, excludeIds)
        const th = 2
        const guides = []
        const x = d.startX + dx, y = d.startY + dy
        const sL = snapValue(x, edges.x, th)
        const sR = snapValue(x + cb.w, edges.x, th)
        const sT = snapValue(y, edges.y, th)
        const sB = snapValue(y + cb.h, edges.y, th)
        if (sL !== null && (sR === null || Math.abs(sL - x) <= Math.abs(sR - (x + cb.w)))) {
          dx = sL - d.startX; guides.push({ axis: "x", pos: sL })
        } else if (sR !== null) {
          dx = sR - cb.w - d.startX; guides.push({ axis: "x", pos: sR })
        }
        if (sT !== null && (sB === null || Math.abs(sT - y) <= Math.abs(sB - (y + cb.h)))) {
          dy = sT - d.startY; guides.push({ axis: "y", pos: sT })
        } else if (sB !== null) {
          dy = sB - cb.h - d.startY; guides.push({ axis: "y", pos: sB })
        }
        dx = Math.max(minDx, Math.min(maxDx, dx))
        dy = Math.max(minDy, Math.min(maxDy, dy))
        this.guides = guides
      } else {
        this.guides = []
      }

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
        this.$emit("drag-end")
      } else if (this.dragPending) {
        const p = this.dragPending
        if (p.mod && p.wasSelected) {
          this.setSelected(this.localSelected.filter(id => id !== p.control.id))
        } else if (!p.mod) {
          this.setSelected([p.control.id])
        }
      }
      this.dragPending = null
    },

    // Resize (single)
    startResize(item, handle, e) {
      e.preventDefault()
      e.stopPropagation()
      this.$emit("before-resize")
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const b = controlBounds(item)
      this.resizing = {
        control: item,
        handle,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startX: b.x,
        startY: b.y,
        startW: b.w,
        startH: b.h,
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
      this.$emit("before-resize")
      const canvas = this.$refs.canvas
      const rect = canvas.getBoundingClientRect()
      const bounds = this.selectionBounds
      const items = []
      for (const id of this.localSelected) {
        const c = this.items.find(ctrl => ctrl.id === id)
        if (!c) continue
        const b = controlBounds(c)
        items.push({ control: c, startX: b.x, startY: b.y, startW: b.w, startH: b.h })
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
      const excludeIds = !e.shiftKey ? new Set([c.id]) : null
      const edges = excludeIds ? getSnapEdges(this.items, excludeIds) : null
      const th = 2
      const guides = []
      const snap = (v, axis) => {
        if (!edges) return v
        const s = snapValue(v, edges[axis], th)
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
      this.$emit("resize-end")
    }
  }
}
</script>

<template>
  <div ref='canvas' class='canvas-editor' @mousedown='onCanvasMousedown'>
    <div
      v-for='(item, i) in items'
      :key='item.id'
      class='canvas-item'
      :class='{ selected: localSelected.includes(item.id) }'
      :style='controlStyle(item, i)'
      @mousedown='startDrag(item, $event)'
      @click.stop
    >
      <div class='item-inner'>
        <slot name='item' :item='item' />
      </div>
      <template v-if='localSelected.length === 1 && item.id === selectedId'>
        <div class='handle nw' @mousedown='startResize(item, "nw", $event)'></div>
        <div class='handle ne' @mousedown='startResize(item, "ne", $event)'></div>
        <div class='handle sw' @mousedown='startResize(item, "sw", $event)'></div>
        <div class='handle se' @mousedown='startResize(item, "se", $event)'></div>
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
    <div v-if='!items.length' class='empty'>
      <slot name='empty' />
    </div>
  </div>
</template>

<style lang='sass' scoped>
.canvas-editor
  position: relative
  overflow: hidden
  user-select: none

.canvas-item
  position: absolute
  border: 2px solid transparent
  border-radius: 6px
  cursor: move
  box-sizing: border-box

  &.selected
    border-color: #4a9eff
    z-index: 100 !important

.item-inner
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

.empty
  position: absolute
  inset: 0
  display: flex
  align-items: center
  justify-content: center
  color: #444
  font-size: 0.875rem
</style>
