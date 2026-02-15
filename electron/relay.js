import { io } from "socket.io-client"

let socket = null
let currentSession = null

export function connectToRelay(url, onEvent) {
  return new Promise((resolve) => {
    socket = io(url, { rejectUnauthorized: false })

    socket.on("connect", () => {
      console.log("Connected to relay:", socket.id)
      resolve({ success: true, socketId: socket.id })
    })

    socket.on("connect_error", (err) => {
      console.error("Relay connection error:", err.message)
      resolve({ success: false, error: err.message })
    })

    socket.on("control:change", data => onEvent("control:change", data))
    socket.on("seat:taken", data => onEvent("seat:taken", data))
    socket.on("seat:released", data => onEvent("seat:released", data))
    socket.on("session:updated", data => onEvent("session:updated", data))
  })
}

export function disconnectFromRelay() {
  socket?.disconnect()
  socket = null
  currentSession = null
}

export function createSession(data) {
  return new Promise((resolve) => {
    if (!socket) return resolve({ success: false, error: "Not connected" })

    socket.emit("host:create", data, (response) => {
      if (response.success) {
        currentSession = response.session
        console.log("Session created, id:", currentSession.id)
      }
      resolve(response)
    })
  })
}

export function updateSession(data) {
  if (!socket) return console.log("updateSession: socket is null")
  if (!currentSession) return console.log("updateSession: currentSession is null")
  console.log("Electron sending host:update, seats:", data.seats?.length)
  socket.emit("host:update", { sessionId: currentSession.id, ...data })
}

export function kickFromSeat(data) {
  if (!socket || !currentSession) return
  socket.emit("host:kick", { sessionId: currentSession.id, ...data })
}

export function sendControlChange(data) {
  if (!socket || !currentSession) return
  socket.emit("host:controlChange", { sessionId: currentSession.id, ...data })
}

export function closeSession() {
  if (!socket || !currentSession) return
  socket.emit("host:close", { sessionId: currentSession.id })
  currentSession = null
}

export function getSession() {
  return currentSession
}
