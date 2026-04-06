<script>
import { useHostStore } from "../../stores/host"
import SeatCanvas from "../SeatCanvas.vue"

export default {
  name: "SeatCard",
  components: { SeatCanvas },
  props: {
    seat: { type: Object, required: true },
    autoRename: { type: Boolean, default: false },
    learnMode: { type: Boolean, default: false }
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
    onControl(control, keys) {
      this.host.sendControlOutput(control, keys)
      this.host.sendControlChange(this.seat.id, control)
    },
    onLearn(control, key) {
      this.host.sendSingleCC(control, key)
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
  <div class='seat-card' :style='seat.occupiedBy ? { borderColor: seat.color } : null'>
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

    <div class='seat-controls' :style='{ aspectRatio: `${seat.aspectW || 9} / ${seat.aspectH || 19.5}` }'>
      <SeatCanvas
        v-if='seat.controls.length'
        :controls='seat.controls'
        :accent='seat.color'
        :learn-mode='learnMode'
        @control='onControl'
        @learn='onLearn'
      />
      <span v-else class='empty'>No controls</span>
    </div>

    <div v-if='confirmDelete' class='seat-actions confirm'>
      <span>Delete?</span>
      <IconButton icon='check' :icon-size='12' class='delete' @click='deleteSeat'>Yes</IconButton>
      <IconButton icon='x' :icon-size='12' @click='cancelDelete'>No</IconButton>
    </div>
    <div v-else class='seat-actions'>
      <IconButton v-if='seat.occupiedBy' icon='user-x' :icon-size='14' tooltip='Kick' class='kick' @click='kick' />
      <IconButton icon='copy' :icon-size='14' tooltip='Duplicate' @click='duplicate' />
      <IconButton icon='pencil' :icon-size='14' tooltip='Edit' @click='edit' />
      <IconButton icon='trash-2' :icon-size='14' tooltip='Delete' class='delete' @click='deleteSeat' />
    </div>
  </div>
</template>

<style lang='sass' scoped>
.seat-card
  display: flex
  flex-direction: column
  background: var(--bg-raised)
  border: 1px solid var(--border)
  border-radius: 8px
  overflow: hidden
  transition: border-color 0.2s

  &:hover
    border-color: var(--border-light)

.seat-header
  display: flex
  align-items: center
  gap: 0.6rem
  padding: 0.6rem 0.7rem

.color
  width: 18px
  height: 18px
  border-radius: 4px
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
    font-size: 0.8rem
    white-space: nowrap
    overflow: hidden
    text-overflow: ellipsis
    cursor: text

    &:hover
      color: var(--accent)

  .name-input
    font-weight: 600
    font-size: 0.8rem
    font-family: var(--font-ui)
    background: var(--bg-base)
    border: 1px solid var(--accent)
    border-radius: 3px
    color: white
    padding: 0 4px
    width: 100%
    outline: none

  .status
    font-size: 0.6rem
    color: var(--text-muted)
    text-transform: uppercase
    letter-spacing: 0.04em

    &.occupied
      color: var(--accent)

.seat-controls
  padding: 0.35rem 0.6rem

  .empty
    text-align: center
    color: var(--text-muted)
    font-size: 0.7rem
    padding: 1.25rem 0

.seat-actions
  display: flex
  gap: 0.35rem
  padding: 0.4rem 0.6rem 0.5rem
  border-top: 1px solid var(--border)
  align-items: center

  &.confirm span
    font-size: 0.65rem
    color: var(--red)
    font-weight: 500

  button
    flex: 1
    padding: 0.35rem
    background: var(--bg-surface)
    border: none
    border-radius: 4px
    color: var(--text-dim)
    font-size: 0.65rem
    font-family: var(--font-ui)
    cursor: pointer

    &:hover
      color: var(--text)
      background: var(--bg-hover)

    &.kick
      color: var(--orange)

      &:hover
        background: var(--orange)
        color: white

    &.delete
      color: var(--red)

      &:hover
        background: var(--red)
        color: white
</style>
