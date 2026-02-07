import { defineStore } from "pinia"
import { io } from "socket.io-client"

const isElectron = !!window.electronAPI

export const useRelayStore = defineStore("relay", {
  state: () => ({
    socket: null,
    connected: false,
    socketId: null
  }),

  actions: {
    async connect(url) {
      if (isElectron) {
        const result = await window.electronAPI.relay.connect(url)
        if (result.success) {
          this.connected = true
          this.socketId = result.socketId
        }
        return result
      }

      return new Promise((resolve) => {
        this.socket = io(url)

        this.socket.on("connect", () => {
          this.connected = true
          this.socketId = this.socket.id
          resolve({ success: true })
        })

        this.socket.on("connect_error", (err) => {
          resolve({ success: false, error: err.message })
        })

        this.socket.on("disconnect", () => {
          this.connected = false
          this.socketId = null
        })
      })
    },

    disconnect() {
      if (isElectron) {
        window.electronAPI.relay.disconnect()
      } else {
        this.socket?.disconnect()
        this.socket = null
      }
      this.connected = false
      this.socketId = null
    },

    emit(event, data) {
      return new Promise((resolve, reject) => {
        if (!this.socket) return reject(new Error("Not connected"))
        this.socket.emit(event, data, (response) => {
          response.success ? resolve(response) : reject(new Error(response.error))
        })
      })
    },

    emitNoAck(event, data) {
      this.socket?.emit(event, data)
    },

    on(event, callback) {
      this.socket?.on(event, callback)
    },

    off(event, callback) {
      this.socket?.off(event, callback)
    }
  }
})
