<script>
import { useHostStore } from "../../stores/host"
import SeatCanvas from "../SeatCanvas.vue"

export default {
  name: "SeatCard",
  components: { SeatCanvas },
  props: {
    seat: { type: Object, required: true },
    autoRename: { type: Boolean, default: false }
  },
  emits: ["duplicate"],
  data: () => ({
    editingName: false,
    confirmDelete: false
  }),
  computed: {
    host() { return useHostStore() }
  },
  mounted() {
    if (this.autoRename) this.startRename()
  },
  methods: {
    startRename(e) {
      this.editingName = true
      this.$nextTick(() => {
        const input = this.$refs.nameInput
        if (input) { input.focus(); input.select() }
      })
    },
    finishRename(e) {
      const name = e.target.value.trim()
      if (name) this.host.updateSeat(this.seat.id, { name })
      this.editingName = false
    },
    recolor(e) {
      this.host.updateSeat(this.seat.id, { color: e.target.value })
    },
    onControl(control, value, valueY) {
      control.value = value
      if (valueY !== undefined) control.valueY = valueY
      const args = valueY !== undefined ? [value, valueY] : [value]
      this.host.sendOsc(control.oscAddress, args)
      this.host.sendControlMidi(control, value, valueY)
      this.host.sendControlChange(this.seat.id, control.id, value, valueY)
    },
    duplicate() {
      const id = this.host.duplicateSeat(this.seat.id)
      this.$emit("duplicate", id)
    },
    kick() { this.host.kickSeat(this.seat.id) },
    deleteSeat() {
      if (this.seat.controls.length && !this.confirmDelete) {
        this.confirmDelete = true
        return
      }
      this.host.deleteSeat(this.seat.id)
    },
    cancelDelete() { this.confirmDelete = false },
    edit() { this.$router.push(`/seat/${this.seat.id}/edit`) }
  }
}
</script>

<template>
  <div class='seat-card' :style='{ borderColor: seat.color }'>
    <div class='seat-header' :style='{ background: seat.color + "22" }'>
      <label class='color' :style='{ background: seat.color }'>
        <input type='color' :value='seat.color' @input='recolor' />
      </label>
      <div class='info'>
        <input
          v-if='editingName'
          ref='nameInput'
          class='name-input'
          :value='seat.name'
          @blur='finishRename'
          @keyup.enter='$event.target.blur()'
        />
        <span v-else class='name' @click='startRename'>{{ seat.name }}</span>
        <span class='status' :class='{ occupied: seat.occupiedBy }'>
          {{ seat.occupiedBy ? "In use" : "Available" }}
        </span>
      </div>
    </div>

    <div class='seat-controls'>
      <SeatCanvas
        v-if='seat.controls.length'
        :controls='seat.controls'
        @control='onControl'
      />
      <span v-else class='empty'>No controls</span>
    </div>

    <div v-if='confirmDelete' class='seat-actions confirm'>
      <span>Delete?</span>
      <button class='delete' @click='deleteSeat'>Yes</button>
      <button @click='cancelDelete'>No</button>
    </div>
    <div v-else class='seat-actions'>
      <button v-if='seat.occupiedBy' class='kick' @click='kick'>Kick</button>
      <button @click='duplicate'>Duplicate</button>
      <button @click='edit'>Edit</button>
      <button class='delete' @click='deleteSeat'>Delete</button>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.seat-card
  display: flex
  flex-direction: column
  background: #0d0d1a
  border: 2px solid
  border-radius: 10px
  overflow: hidden

.seat-header
  display: flex
  align-items: center
  gap: 0.75rem
  padding: 0.75rem

.color
  width: 24px
  height: 24px
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

.info
  flex: 1
  display: flex
  flex-direction: column
  min-width: 0

  .name
    font-weight: 600
    font-size: 0.9rem
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    cursor: text

    &:hover
      color: #4a9eff

  .name-input
    font-weight: 600
    font-size: 0.9rem
    background: #0d0d1a
    border: 1px solid #4a9eff
    border-radius: 3px
    color: white
    padding: 0 4px
    width: 100%
    outline: none

  .status
    font-size: 0.675rem
    color: #666

    &.occupied
      color: #4a9eff

.seat-controls
  aspect-ratio: 9 / 19.5
  padding: 0.5rem 0.75rem

  .empty
    text-align: center
    color: #444
    font-size: 0.75rem
    padding: 1.5rem 0

.seat-actions
  display: flex
  gap: 0.5rem
  padding: 0.5rem 0.75rem 0.75rem
  border-top: 1px solid #1a1a2e
  align-items: center

  &.confirm span
    font-size: 0.7rem
    color: #e74c3c

  button
    flex: 1
    padding: 0.4rem
    background: #1a1a2e
    border: none
    border-radius: 4px
    color: #888
    font-size: 0.7rem
    cursor: pointer

    &:hover
      color: white
      background: #252542

    &.kick
      color: #e67e22

      &:hover
        background: #e67e22
        color: white

    &.delete
      color: #e74c3c

      &:hover
        background: #e74c3c
        color: white
</style>
