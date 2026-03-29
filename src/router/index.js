import { createRouter, createWebHistory } from "vue-router"

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../views/web/HomeView.vue") },
    { path: "/session/:id", name: "lobby", component: () => import("../views/web/LobbyView.vue") },
    { path: "/session/:id/seat/:seatId", name: "seat", component: () => import("../views/web/SeatView.vue") }
  ]
})
