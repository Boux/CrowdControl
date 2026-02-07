import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import cors from "cors"
import { nanoid } from "nanoid"

const app = express()
const server = createServer(app)
const io = new Server(server, { cors: { origin: "*" } })

app.use(cors())
app.use(express.json())

// In-memory session storage
const sessions = new Map()

// Session structure: { id, name, hostSocketId, seats: [], oscConfig: {} }

io.on("connection", (socket) => {
  console.log("Connected:", socket.id)

  // Host creates a session
  socket.on("host:create", (data, callback) => {
    const id = nanoid(8)
    const session = { id, name: data.name, hostSocketId: socket.id, seats: [], oscConfig: data.oscConfig || {} }
    sessions.set(id, session)
    socket.join(`session:${id}`)
    socket.join(`host:${id}`)
    callback({ success: true, session })
    console.log("Session created:", id)
  })

  // Host updates session
  socket.on("host:update", (data) => {
    console.log("host:update received:", data.sessionId, "seats:", data.seats?.length)
    const session = sessions.get(data.sessionId)
    if (!session || session.hostSocketId !== socket.id) return

    if (data.name) session.name = data.name
    if (data.oscConfig) session.oscConfig = data.oscConfig
    if (data.seats !== undefined) session.seats = data.seats

    console.log("Broadcasting session:updated, seats:", session.seats?.length)
    io.to(`session:${data.sessionId}`).emit("session:updated", { session })
  })

  // Host closes session
  socket.on("host:close", (data) => {
    const session = sessions.get(data.sessionId)
    if (!session || session.hostSocketId !== socket.id) return

    io.to(`session:${data.sessionId}`).emit("session:closed")
    sessions.delete(data.sessionId)
    console.log("Session closed:", data.sessionId)
  })

  // Client joins session
  socket.on("client:join", (data, callback) => {
    const session = sessions.get(data.sessionId)
    if (!session) return callback({ success: false, error: "Session not found" })

    console.log("client:join", data.sessionId, "seats:", session.seats?.length)
    socket.join(`session:${data.sessionId}`)
    callback({ success: true, session })
  })

  // Client takes seat
  socket.on("client:takeSeat", (data, callback) => {
    const session = sessions.get(data.sessionId)
    if (!session) return callback({ success: false, error: "Session not found" })

    const seat = session.seats.find(s => s.id === data.seatId)
    if (!seat) return callback({ success: false, error: "Seat not found" })
    if (seat.occupiedBy && seat.occupiedBy !== socket.id) return callback({ success: false, error: "Seat taken" })

    seat.occupiedBy = socket.id
    io.to(`host:${data.sessionId}`).emit("seat:taken", { seatId: seat.id, socketId: socket.id })
    io.to(`session:${data.sessionId}`).emit("session:updated", { session })
    callback({ success: true, seat })
  })

  // Client releases seat
  socket.on("client:releaseSeat", (data) => {
    const session = sessions.get(data.sessionId)
    if (!session) return

    const seat = session.seats.find(s => s.id === data.seatId)
    if (!seat || seat.occupiedBy !== socket.id) return

    seat.occupiedBy = null
    io.to(`host:${data.sessionId}`).emit("seat:released", { seatId: seat.id })
    io.to(`session:${data.sessionId}`).emit("session:updated", { session })
  })

  // Client sends control change - relay to host
  socket.on("control:change", (data) => {
    const session = sessions.get(data.sessionId)
    if (!session) return

    io.to(`host:${data.sessionId}`).emit("control:change", {
      seatId: data.seatId,
      controlId: data.controlId,
      value: data.value,
      valueY: data.valueY
    })
  })

  // Host kicks client from seat
  socket.on("host:kick", (data) => {
    const session = sessions.get(data.sessionId)
    if (!session || session.hostSocketId !== socket.id) return

    const seat = session.seats.find(s => s.id === data.seatId)
    if (!seat?.occupiedBy) return

    const kickedSocketId = seat.occupiedBy
    seat.occupiedBy = null

    io.to(kickedSocketId).emit("seat:kicked")
    io.to(`session:${data.sessionId}`).emit("session:updated", { session })
  })

  // Client heartbeat
  socket.on("client:heartbeat", (data) => {
    const session = sessions.get(data.sessionId)
    if (!session) return

    const seat = session.seats.find(s => s.occupiedBy === socket.id)
    if (seat) seat.lastHeartbeat = Date.now()
  })

  // Disconnect cleanup
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id)

    sessions.forEach((session, sessionId) => {
      // If host disconnected, close session
      if (session.hostSocketId === socket.id) {
        io.to(`session:${sessionId}`).emit("session:closed")
        sessions.delete(sessionId)
        return
      }

      // Release any seats held by this socket
      const seat = session.seats.find(s => s.occupiedBy === socket.id)
      if (!seat) return

      seat.occupiedBy = null
      io.to(`host:${sessionId}`).emit("seat:released", { seatId: seat.id })
      io.to(`session:${sessionId}`).emit("session:updated", { session })
    })
  })
})

// Heartbeat check - release stale seats every 5s
setInterval(() => {
  const now = Date.now()
  sessions.forEach((session, sessionId) => {
    session.seats
      .filter(s => s.occupiedBy && s.lastHeartbeat && now - s.lastHeartbeat > 5000)
      .forEach(seat => {
        console.log("Releasing stale seat:", seat.id)
        seat.occupiedBy = null
        io.to(`host:${sessionId}`).emit("seat:released", { seatId: seat.id })
        io.to(`session:${sessionId}`).emit("session:updated", { session })
      })
  })
}, 5000)

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Relay server on port ${PORT}`))
