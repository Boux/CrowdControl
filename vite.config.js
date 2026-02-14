import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import basicSsl from "@vitejs/plugin-basic-ssl"

function relayPlugin() {
  return {
    name: "crowd-control-relay",
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
  plugins: [vue(), basicSsl(), relayPlugin()],
  server: {
    host: "0.0.0.0",
    allowedHosts: true
  }
})
