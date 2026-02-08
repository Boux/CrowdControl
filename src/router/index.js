import { createRouter, createWebHistory } from "vue-router"

const isElectron = !!window.electronAPI

// Web routes (participants)
const webRoutes = [
  { path: "/", name: "home", component: () => import("../views/web/HomeView.vue") },
  { path: "/session/:id", name: "lobby", component: () => import("../views/web/LobbyView.vue") },
  { path: "/session/:id/seat/:seatId", name: "seat", component: () => import("../views/web/SeatView.vue") }
]

// Electron routes (host)
const electronRoutes = [
  { path: "/", name: "setup", component: () => import("../views/electron/SetupView.vue") },
  { path: "/dashboard", name: "dashboard", component: () => import("../views/electron/DashboardView.vue") },
  { path: "/seat/:seatId/edit", name: "seatEditor", component: () => import("../views/electron/SeatEditorView.vue") },
  { path: "/settings", name: "settings", component: () => import("../views/electron/SettingsView.vue") }
]

export default createRouter({
  history: createWebHistory(),
  routes: isElectron ? electronRoutes : webRoutes
})
