<script>
export default {
  name: "App"
}
</script>

<template>
  <router-view />
</template>

<style lang='sass'>
:root
  --bg-base: #0c0c14
  --bg-raised: #12121e
  --bg-surface: #1a1a2e
  --bg-hover: #222240
  --border: #1e1e34
  --border-light: #2a2a48
  --text: #e0e0e8
  --text-dim: #6e6e88
  --text-muted: color-mix(in srgb, var(--text) 50%, transparent)
  --accent: #4a9eff
  --accent-glow: rgba(74, 158, 255, 0.15)
  --green: #2ecc71
  --orange: #e67e22
  --red: #e74c3c
  --font-ui: "Instrument Sans", system-ui, sans-serif
  --font-mono: "JetBrains Mono", ui-monospace, monospace


*
  margin: 0
  padding: 0
  box-sizing: border-box
  -webkit-tap-highlight-color: transparent

html, body
  font-family: var(--font-ui)
  background: var(--bg-base)
  color: var(--text)
  min-height: 100vh
  -webkit-font-smoothing: antialiased
  font-feature-settings: "cv11", "ss01"

#app
  min-height: 100vh

::-webkit-scrollbar
  width: 6px

::-webkit-scrollbar-track
  background: transparent

::-webkit-scrollbar-thumb
  background: var(--border-light)
  border-radius: 3px

  &:hover
    background: var(--text-muted)

</style>
