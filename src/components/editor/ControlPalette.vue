<script>
export default {
  name: "ControlPalette",
  emits: ["add"],
  data: () => ({
    types: [
      { type: "xy-pad", label: "XY Pad", icon: "move" },
      { type: "fader", label: "Fader", icon: "sliders-vertical" },
      { type: "button", label: "Button", icon: "circle" },
      { type: "toggle", label: "Toggle", icon: "toggle-left" }
    ]
  })
}
</script>

<template>
  <div class='palette'>
    <h3>Add Control</h3>
    <div class='items'>
      <IconButton v-for='t in types' :key='t.type' :icon='t.icon' :icon-size='20' @click='$emit("add", t.type)'>
        <span class='label'>{{ t.label }}</span>
      </IconButton>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.palette
  background: #1a1a2e
  border-radius: 8px
  padding: 1rem

  h3
    font-size: 0.875rem
    color: #888
    margin: 0 0 0.75rem

.items
  display: flex
  gap: 0.5rem
  flex-wrap: wrap

  button
    display: flex
    flex-direction: column
    align-items: center
    gap: 0.25rem
    padding: 0.75rem 1rem
    background: #0d0d1a
    border: 1px solid #333
    border-radius: 6px
    color: white
    cursor: pointer

    &:hover
      border-color: #4a9eff
      background: rgba(74, 158, 255, 0.1)

    .label
      font-size: 0.75rem
</style>
