import { app, BrowserWindow, ipcMain } from "electron"
import path from "path"
import { fileURLToPath } from "url"
import { createOscClient, sendOsc } from "./osc.js"
import { getOutputs, connectMidi, sendCC, closeMidi } from "./midi.js"
import { connectToRelay, disconnectFromRelay, createSession, updateSession, kickFromSeat, sendControlChange, closeSession } from "./relay.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === "development"
const relayUrl = process.env.RELAY_URL || (isDev ? "https://localhost:5173" : "https://localhost:3001")

let mainWindow = null
let oscClient = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    mainWindow.loadURL("https://localhost:5173")
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"))
  }
}

// Accept self-signed certs (prod server uses self-signed too)
app.commandLine.appendSwitch("ignore-certificate-errors")

app.whenReady().then(createWindow)
app.on("window-all-closed", () => app.quit())

// IPC handlers
ipcMain.handle("relay:getUrl", () => relayUrl)

ipcMain.handle("relay:connect", async (_, url) => {
  return connectToRelay(url, (event, data) => {
    mainWindow?.webContents.send("relay:event", { event, data })
  })
})

ipcMain.handle("relay:disconnect", () => disconnectFromRelay())

ipcMain.handle("session:create", async (_, data) => createSession(data))

ipcMain.handle("session:close", () => closeSession())

ipcMain.handle("session:update", (_, data) => updateSession(data))

ipcMain.handle("session:kick", (_, data) => kickFromSeat(data))

ipcMain.handle("session:controlChange", (_, data) => sendControlChange(data))

ipcMain.handle("osc:connect", async (_, config) => {
  oscClient = createOscClient(config)
  return { success: true }
})

ipcMain.handle("osc:send", (_, { address, args }) => {
  if (!oscClient) return
  sendOsc(oscClient, address, args)
})

ipcMain.handle("midi:getOutputs", () => getOutputs())

ipcMain.handle("midi:connect", (_, deviceName) => connectMidi(deviceName))

ipcMain.handle("midi:send", (_, { channel, controller, value }) => sendCC(channel, controller, value))

ipcMain.handle("midi:disconnect", () => closeMidi())
