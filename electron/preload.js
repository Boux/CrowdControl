const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  relay: {
    connect: (url) => ipcRenderer.invoke("relay:connect", url),
    disconnect: () => ipcRenderer.invoke("relay:disconnect"),
    onEvent: (callback) => ipcRenderer.on("relay:event", (_, data) => callback(data))
  },
  session: {
    create: (data) => ipcRenderer.invoke("session:create", data),
    update: (data) => ipcRenderer.invoke("session:update", data),
    kick: (data) => ipcRenderer.invoke("session:kick", data)
  },
  osc: {
    connect: (config) => ipcRenderer.invoke("osc:connect", config),
    send: (address, args) => ipcRenderer.invoke("osc:send", { address, args })
  }
})
