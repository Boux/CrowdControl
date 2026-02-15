import { Server } from "socket.io"
import { nanoid } from "nanoid"

export function attachRelay(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" } })
  const sessions = new Map()

  function updateControlValue(session, data) {
    const seat = session.seats.find(s => s.id === data.seatId)
    const control = seat?.controls?.find(c => c.id === data.controlId)
    if (!control) return
    control.value = data.value
    if (data.valueY !== undefined) control.valueY = data.valueY
  }

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id)

    socket.on("host:create", (data, callback) => {
      if (data.id && sessions.has(data.id)) {
        const session = sessions.get(data.id)
        session.hostSocketId = socket.id
        if (data.name) session.name = data.name
        socket.join(`session:${data.id}`)
        socket.join(`host:${data.id}`)
        callback({ success: true, session })
        console.log("Session resumed:", data.id)
        return
      }

      const id = data.id || nanoid(8)
      const session = { id, name: data.name, hostSocketId: socket.id, seats: [], oscConfig: data.oscConfig || {} }
      sessions.set(id, session)
      socket.join(`session:${id}`)
      socket.join(`host:${id}`)
      callback({ success: true, session })
      console.log("Session created:", id)
    })

    socket.on("host:update", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session || session.hostSocketId !== socket.id) return

      if (data.name) session.name = data.name
      if (data.oscConfig) session.oscConfig = data.oscConfig
      if (data.seats !== undefined) session.seats = data.seats

      io.to(`session:${data.sessionId}`).emit("session:updated", { session })
    })

    socket.on("host:close", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session || session.hostSocketId !== socket.id) return

      io.to(`session:${data.sessionId}`).emit("session:closed")
      sessions.delete(data.sessionId)
      console.log("Session closed:", data.sessionId)
    })

    socket.on("client:join", (data, callback) => {
      const session = sessions.get(data.sessionId)
      if (!session) return callback({ success: false, error: "Session not found" })

      socket.join(`session:${data.sessionId}`)
      callback({ success: true, session })
    })

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

    socket.on("client:releaseSeat", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session) return

      const seat = session.seats.find(s => s.id === data.seatId)
      if (!seat || seat.occupiedBy !== socket.id) return

      seat.occupiedBy = null
      io.to(`host:${data.sessionId}`).emit("seat:released", { seatId: seat.id })
      io.to(`session:${data.sessionId}`).emit("session:updated", { session })
    })

    socket.on("control:change", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session) return

      updateControlValue(session, data)
      io.to(`host:${data.sessionId}`).emit("control:change", {
        seatId: data.seatId,
        controlId: data.controlId,
        value: data.value,
        valueY: data.valueY
      })
    })

    socket.on("host:controlChange", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session || session.hostSocketId !== socket.id) return

      updateControlValue(session, data)
      socket.to(`session:${data.sessionId}`).emit("control:change", {
        seatId: data.seatId,
        controlId: data.controlId,
        value: data.value,
        valueY: data.valueY
      })
    })

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

    socket.on("client:heartbeat", (data) => {
      const session = sessions.get(data.sessionId)
      if (!session) return

      const seat = session.seats.find(s => s.occupiedBy === socket.id)
      if (seat) seat.lastHeartbeat = Date.now()
    })

    socket.on("disconnect", () => {
      console.log("Disconnected:", socket.id)

      sessions.forEach((session, sessionId) => {
        if (session.hostSocketId === socket.id) {
          session.hostSocketId = null
          return
        }

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

  return io
}
