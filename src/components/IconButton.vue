<script>
export default {
  name: "IconButton",
  props: {
    icon: { type: String, default: null },
    iconSize: { type: Number, default: 16 },
    to: { type: [String, Object], default: null }
  },
  computed: {
    tag() { return this.to ? "router-link" : "button" },
    bind() { return this.to ? { to: this.to } : {} }
  }
}
</script>

<template>
  <component :is='tag' v-bind='bind' class='icon-btn'>
    <Icon v-if='icon' :name='icon' :size='iconSize' />
    <slot />
  </component>
</template>

<style lang='sass'>
.icon-btn
  display: inline-flex
  align-items: center
  justify-content: center
  gap: 0.4rem
</style>
