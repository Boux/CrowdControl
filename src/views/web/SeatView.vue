<script>
import { useSessionStore } from "../../stores/session"
import SeatCanvas from "../../components/SeatCanvas.vue"

export default {
  name: "SeatView",
  components: { SeatCanvas },
  computed: {
    session() { return useSessionStore() },
    seat() { return this.session.currentSeat },
    controls() { return this.session.controls },
    canvasStyle() {
      const w = this.seat?.aspectW || 9
      const h = this.seat?.aspectH || 19.5
      return { width: `min(100%, calc((100dvh - 60px) * ${w} / ${h}))` }
    }
  },
  watch: {
    seat(val) {
      if (!val) this.leave()
    }
  },
  mounted() {
    if (!this.seat) return this.$router.replace(`/session/${this.$route.params.id}`)
    window.addEventListener("beforeunload", this.handleUnload)
  },
  beforeUnmount() {
    window.removeEventListener("beforeunload", this.handleUnload)
    this.session.releaseSeat()
  },
  methods: {
    handleUnload() {
      this.session.releaseSeat()
    },
    leave() {
      if (!this.session.session) return this.$router.push("/")
      this.$router.push(`/session/${this.session.session.id}`)
    },
    onControl(control, value, valueY) {
      this.session.sendControl(control.id, value, valueY)
    }
  }
}
</script>

<template>
  <div class='seat-view'>
    <header v-if='seat' :style='{ borderColor: seat.color }'>
      <button class='back' @click='leave'>&larr;</button>
      <div class='badge' :style='{ background: seat.color }'>{{ seat.name }}</div>
    </header>

    <div v-if='seat && !controls.length' class='empty'>No controls configured yet.</div>

    <div class='canvas' :style='canvasStyle'>
      <SeatCanvas :controls='controls' :accent='seat?.color' @control='onControl' />
    </div>
  </div>
</template>

<style lang='sass' scoped>
.seat-view
  height: 100vh
  height: 100dvh
  display: flex
  flex-direction: column
  padding: 0
  overflow: hidden

header
  display: flex
  align-items: center
  gap: 1rem
  padding: 0.75rem 1rem
  border-bottom: 2px solid

.back
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  cursor: pointer

.badge
  padding: 0.5rem 1rem
  border-radius: 6px
  font-weight: 600
  color: white

.empty
  text-align: center
  color: #666
  padding: 2rem
  background: #1a1a2e
  border-radius: 8px
  margin: 1rem

.canvas
  flex: 1
  min-height: 0
  align-self: center
</style>
