<script>
export default {
  name: "App"
}
</script>

<template>
  <router-view />
</template>

<style lang='sass'>
*
  margin: 0
  padding: 0
  box-sizing: border-box

html, body
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
  background: #0d0d1a
  color: #fff
  min-height: 100vh
  -webkit-font-smoothing: antialiased

#app
  min-height: 100vh
</style>
