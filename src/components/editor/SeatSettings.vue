<script>
export default {
  name: "SeatSettings",
  props: {
    seat: { type: Object, required: true }
  },
  emits: ["set-aspect"],
  computed: {
    aspectW() { return this.seat?.aspectW || 9 },
    aspectH() { return this.seat?.aspectH || 19.5 }
  }
}
</script>

<template>
  <div class='seat-settings'>
    <h3>Canvas Size</h3>
    <div class='presets'>
      <IconButton icon='smartphone' :icon-size='12' :class='{ active: aspectW === 9 && aspectH === 19.5 }' @click='$emit("set-aspect", 9, 19.5)'>Phone</IconButton>
      <IconButton icon='smartphone' :icon-size='12' :class='{ active: aspectW === 9 && aspectH === 16 }' @click='$emit("set-aspect", 9, 16)'>Wide</IconButton>
      <IconButton icon='tablet' :icon-size='12' :class='{ active: aspectW === 3 && aspectH === 4 }' @click='$emit("set-aspect", 3, 4)'>Tablet</IconButton>
      <IconButton icon='square' :icon-size='12' :class='{ active: aspectW === 1 && aspectH === 1 }' @click='$emit("set-aspect", 1, 1)'>Square</IconButton>
    </div>
    <table>
      <tr>
        <td>W</td>
        <td><input :value='aspectW' type='number' step='0.5' min='1' @change='$emit("set-aspect", +$event.target.value, aspectH)' /></td>
        <td>H</td>
        <td><input :value='aspectH' type='number' step='0.5' min='1' @change='$emit("set-aspect", aspectW, +$event.target.value)' /></td>
      </tr>
    </table>
    <div class='no-selection'>Click a control to edit its settings</div>
  </div>
</template>

<style lang='sass' scoped>
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

  input
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

.no-selection
  color: #555
  font-size: 0.875rem
  text-align: center
  padding: 2rem 0
</style>
