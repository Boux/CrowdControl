import { createRouter, createWebHashHistory } from "vue-router"

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "setup", component: () => import("../views/electron/SetupView.vue") },
    { path: "/dashboard", name: "dashboard", component: () => import("../views/electron/DashboardView.vue") },
    { path: "/seat/:seatId/edit", name: "seatEditor", component: () => import("../views/electron/SeatEditorView.vue") },
    { path: "/settings", name: "settings", component: () => import("../views/electron/SettingsView.vue") }
  ]
})
