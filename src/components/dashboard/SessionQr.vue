<script>
import QRCode from "qrcode"

export default {
  name: "SessionQr",
  props: {
    url: { type: String, required: true },
    code: { type: String, required: true }
  },
  data: () => ({
    qrSmall: null,
    qrLarge: null,
    open: false
  }),
  watch: {
    url: {
      immediate: true,
      handler(url) { this.generate(url) }
    }
  },
  methods: {
    async generate(url) {
      const opts = { margin: 1, color: { dark: "#ffffff", light: "#00000000" } }
      this.qrSmall = await QRCode.toDataURL(url, { ...opts, width: 256 })
      this.qrLarge = await QRCode.toDataURL(url, { ...opts, width: 512 })
    },
    copy() {
      navigator.clipboard.writeText(this.code)
    }
  }
}
</script>

<template>
  <div class='share'>
    <img v-if='qrSmall' :src='qrSmall' class='qr' @click='open = true' />
    <div class='share-info'>
      <div class='code-row'>
        <input type='text' :value='code' readonly />
        <IconButton icon='copy' @click='copy'>Copy</IconButton>
      </div>
      <div class='session-url'>{{ url }}</div>
    </div>
  </div>

  <Teleport to='body'>
    <div v-if='open' class='qr-overlay' @click='open = false'>
      <div class='qr-modal' @click.stop>
        <img :src='qrLarge' class='qr-large' />
        <div class='qr-modal-url'>{{ url }}</div>
        <div class='qr-modal-code'>{{ code }}</div>
        <IconButton icon='x' @click='open = false'>Close</IconButton>
      </div>
    </div>
  </Teleport>
</template>

<style lang='sass' scoped>
.share
  display: flex
  align-items: center
  gap: 0.6rem

.qr
  width: 80px
  height: 80px
  cursor: pointer
  border-radius: 4px
  opacity: 0.85
  transition: opacity 0.15s

  &:hover
    opacity: 1
    outline: 1px solid var(--accent)

.share-info
  display: flex
  flex-direction: column
  gap: 0.2rem

.session-url
  font-size: 0.55rem
  color: var(--text-muted)
  word-break: break-all

.code-row
  display: flex
  gap: 0.35rem

  input
    width: 110px
    padding: 0.35rem 0.5rem
    border: 1px solid var(--border)
    border-radius: 4px
    background: var(--bg-surface)
    color: var(--text)
    font-family: var(--font-mono)
    font-size: 0.7rem

  button
    padding: 0.35rem 0.6rem
    background: var(--bg-surface)
    border: 1px solid var(--border)
    border-radius: 4px
    color: var(--text-dim)
    cursor: pointer
    font-size: 0.65rem
    font-family: var(--font-ui)

    &:hover
      color: var(--text)
      border-color: var(--border-light)

.qr-overlay
  position: fixed
  inset: 0
  background: rgba(0, 0, 0, 0.85)
  display: flex
  align-items: center
  justify-content: center
  z-index: 1000
  backdrop-filter: blur(4px)

.qr-modal
  display: flex
  flex-direction: column
  align-items: center
  gap: 1rem
  background: var(--bg-raised)
  border: 1px solid var(--border)
  border-radius: 12px
  padding: 2rem
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5)

  .qr-large
    width: 320px
    height: 320px

  .qr-modal-url
    color: var(--text-dim)
    font-size: 0.8rem
    word-break: break-all
    text-align: center

  .qr-modal-code
    font-family: var(--font-mono)
    font-size: 1.4rem
    color: var(--text)
    letter-spacing: 0.1em

  button
    padding: 0.5rem 2rem
    background: var(--bg-surface)
    border: 1px solid var(--border)
    border-radius: 6px
    color: var(--text-dim)
    cursor: pointer
    font-size: 0.8rem
    font-family: var(--font-ui)

    &:hover
      color: var(--text)
      border-color: var(--border-light)
</style>
