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
  margin-left: auto
  display: flex
  align-items: center
  gap: 0.75rem

.qr
  width: 110px
  height: 110px
  cursor: pointer
  border-radius: 6px

  &:hover
    outline: 2px solid #4a9eff

.share-info
  display: flex
  flex-direction: column
  gap: 0.25rem

.session-url
  font-size: 0.625rem
  color: #555
  word-break: break-all

.code-row
  display: flex
  gap: 0.5rem

  input
    width: 120px
    padding: 0.5rem
    border: 1px solid #333
    border-radius: 6px
    background: #1a1a2e
    color: white
    font-family: monospace
    font-size: 0.8rem

  button
    padding: 0.5rem 0.75rem
    background: #333
    border: none
    border-radius: 6px
    color: white
    cursor: pointer
    font-size: 0.75rem

.qr-overlay
  position: fixed
  inset: 0
  background: rgba(0, 0, 0, 0.8)
  display: flex
  align-items: center
  justify-content: center
  z-index: 1000

.qr-modal
  display: flex
  flex-direction: column
  align-items: center
  gap: 1rem
  background: #1a1a2e
  border-radius: 16px
  padding: 2rem

  .qr-large
    width: 360px
    height: 360px

  .qr-modal-url
    color: #888
    font-size: 0.85rem
    word-break: break-all
    text-align: center

  .qr-modal-code
    font-family: monospace
    font-size: 1.5rem
    color: white
    letter-spacing: 0.1em

  button
    padding: 0.5rem 2rem
    background: #333
    border: none
    border-radius: 6px
    color: #888
    cursor: pointer
    font-size: 0.85rem

    &:hover
      color: white
</style>
