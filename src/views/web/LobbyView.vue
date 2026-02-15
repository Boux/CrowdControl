<script>
import { useRelayStore } from "../../stores/relay"
import { useSessionStore } from "../../stores/session"

export default {
  name: "LobbyView",
  data: () => ({ loading: true, error: null }),
  computed: {
    relay() { return useRelayStore() },
    session() { return useSessionStore() },
    seats() { return this.session.seats },
    availableSeats() { return this.session.availableSeats }
  },
  async mounted() {
    if (this.session.session?.id === this.$route.params.id) {
      this.loading = false
      return
    }
    if (!this.relay.connected) await this.relay.connect()
    if (!this.relay.connected) {
      this.error = "Could not connect to relay server"
      this.loading = false
      return
    }
    await this.session.join(this.$route.params.id)
      .catch(err => { this.error = err.message })
    this.loading = false
  },
  methods: {
    async takeSeat(seatId) {
      await this.session.takeSeat(seatId)
        .then(seat => this.$router.push(`/session/${this.session.session.id}/seat/${seat.id}`))
        .catch(err => alert(err.message))
    },
    takeRandom() {
      const seat = this.availableSeats[Math.floor(Math.random() * this.availableSeats.length)]
      if (seat) this.takeSeat(seat.id)
    }
  }
}
</script>

<template>
  <div class='lobby'>
    <div v-if='loading' class='center'>Connecting...</div>
    <div v-else-if='error' class='center'>
      <p class='error'>{{ error }}</p>
      <router-link to='/' class='back-btn'>Back to Home</router-link>
    </div>
    <template v-else>
      <header>
        <router-link to='/' class='leave'>&larr; Leave</router-link>
        <div>
          <h1>{{ session.session?.name }}</h1>
          <p class='code'>{{ session.session?.id }}</p>
        </div>
      </header>

      <h2>Choose a Seat</h2>

      <button v-if='availableSeats.length' class='random-btn' @click='takeRandom'>Random Seat</button>

      <div class='seats'>
        <div
          v-for='seat in seats'
          :key='seat.id'
          class='seat'
          :class='{ occupied: seat.occupiedBy }'
          :style='{ borderColor: seat.color }'
          @click='!seat.occupiedBy && takeSeat(seat.id)'
        >
          <div class='color' :style='{ background: seat.color }'></div>
          <div class='info'>
            <span class='name'>{{ seat.name }}</span>
            <span class='controls'>{{ seat.controls?.length || 0 }} controls</span>
          </div>
          <span v-if='seat.occupiedBy' class='badge'>Taken</span>
        </div>
      </div>

      <p v-if='!seats.length' class='empty'>No seats yet. Wait for the host to add some.</p>
    </template>
  </div>
</template>

<style lang='sass' scoped>
.lobby
  min-height: 100vh
  padding: 1rem
  max-width: 500px
  margin: 0 auto

header
  display: flex
  align-items: center
  gap: 1rem
  margin-bottom: 2rem

  h1
    font-size: 1.5rem
    margin: 0

  .code
    font-size: 0.75rem
    color: #666

.leave
  padding: 0.5rem 1rem
  background: transparent
  border: 1px solid #333
  color: #888
  border-radius: 6px
  text-decoration: none
  white-space: nowrap
  font-size: 0.875rem

  &:hover
    border-color: #4a9eff
    color: #4a9eff

h2
  font-size: 1.25rem
  margin-bottom: 1rem

.random-btn
  width: 100%
  padding: 1rem
  background: linear-gradient(135deg, #4a9eff, #7b68ee)
  border: none
  border-radius: 8px
  color: white
  font-size: 1rem
  font-weight: 600
  cursor: pointer
  margin-bottom: 1.5rem

.seats
  display: flex
  flex-direction: column
  gap: 0.75rem

.seat
  display: flex
  align-items: center
  gap: 1rem
  padding: 1rem
  background: #1a1a2e
  border: 2px solid transparent
  border-radius: 8px
  cursor: pointer

  &.occupied
    opacity: 0.5
    cursor: not-allowed

.color
  width: 40px
  height: 40px
  border-radius: 8px

.info
  flex: 1
  display: flex
  flex-direction: column

.name
  font-weight: 500

.controls
  font-size: 0.75rem
  color: #666

.badge
  padding: 0.25rem 0.5rem
  background: #333
  border-radius: 4px
  font-size: 0.75rem
  color: #888

.empty
  text-align: center
  color: #666
  padding: 2rem

.center
  text-align: center
  padding: 4rem 2rem
  color: #888

  .error
    color: #e74c3c
    margin-bottom: 1.5rem

.back-btn
  display: inline-block
  padding: 0.75rem 1.5rem
  background: #333
  border-radius: 8px
  color: white
  text-decoration: none
  font-size: 0.875rem

  &:hover
    background: #4a9eff
</style>
