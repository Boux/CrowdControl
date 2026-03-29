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
    <div class='items'>
      <IconButton v-for='t in types' :key='t.type' :icon='t.icon' :icon-size='14' @click='$emit("add", t.type)'>
        {{ t.label }}
      </IconButton>
    </div>
  </div>
</template>

<style lang='sass' scoped>
.palette
  background: #1a1a2e
  border-radius: 8px
  padding: 0.5rem

.items
  display: grid
  grid-template-columns: 1fr 1fr
  gap: 0.35rem

  button
    display: flex
    align-items: center
    justify-content: center
    gap: 0.35rem
    padding: 0.4rem 0.5rem
    background: #0d0d1a
    border: 1px solid #333
    border-radius: 4px
    color: white
    cursor: pointer
    font-size: 0.7rem

    &:hover
      border-color: #4a9eff
      background: rgba(74, 158, 255, 0.1)
</style>
