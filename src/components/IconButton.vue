<script>
export default {
  name: "IconButton",
  props: {
    icon: { type: String, default: null },
    iconSize: { type: Number, default: 16 },
    to: { type: [String, Object], default: null },
    tooltip: { type: String, default: null }
  },
  computed: {
    tag() { return this.to ? "router-link" : "button" },
    bind() {
      const b = this.to ? { to: this.to } : {}
      if (this.tooltip) b.title = this.tooltip
      return b
    }
  }
}
</script>

<template>
  <component :is='tag' v-bind='bind' class='icon-btn'>
    <Icon v-if='icon' :name='icon' :size='iconSize' />
    <slot v-if='!tooltip' />
  </component>
</template>

<style lang='sass'>
.icon-btn
  display: inline-flex
  align-items: center
  justify-content: center
  gap: 0.4rem
</style>
