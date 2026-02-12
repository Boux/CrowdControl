import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

function relayPlugin() {
  return {
    name: "crowdosc-relay",
    configureServer(server) {
      import("./server/relay.js").then(({ attachRelay }) => {
        attachRelay(server.httpServer)
        console.log("Relay attached to Vite dev server")
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), relayPlugin()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true
  }
})
