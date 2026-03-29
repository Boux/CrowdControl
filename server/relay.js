import { Server } from "socket.io"
import { nanoid } from "nanoid"

export function attachRelay(httpServer) {
  const io = new Server(httpServer, { cors: { origin: "*" }, transports: ["websocket"] })
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
        socket.data.sessionId = data.id
        socket.join(`session:${data.id}`)
        socket.join(`host:${data.id}`)
        callback({ success: true, session })
        console.log("Session resumed:", data.id)
        return
      }

      const id = data.id || nanoid(8)
      const session = { id, name: data.name, hostSocketId: socket.id, seats: [], oscConfig: data.oscConfig || {} }
      sessions.set(id, session)
      socket.data.sessionId = id
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
      if (data.seats !== undefined) {
        const occupied = new Map()
        for (const s of session.seats)
          if (s.occupiedBy) occupied.set(s.id, { occupiedBy: s.occupiedBy, lastHeartbeat: s.lastHeartbeat })
        for (const s of data.seats) {
          const prev = occupied.get(s.id)
          if (prev) Object.assign(s, prev)
          else { s.occupiedBy = null; delete s.lastHeartbeat }
        }
        session.seats = data.seats
      }

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

      socket.data.sessionId = data.sessionId
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
      socket.data.seatId = data.seatId
      socket.join(`seat:${data.sessionId}:${data.seatId}`)
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
      socket.leave(`seat:${data.sessionId}:${data.seatId}`)
      socket.data.seatId = null
      io.to(`host:${data.sessionId}`).emit("seat:released", { seatId: seat.id })
      io.to(`session:${data.sessionId}`).emit("session:updated", { session })
    })

    socket.on("control:batch", ({ seatId, changes }) => {
      const { sessionId } = socket.data
      const session = sessions.get(sessionId)
      if (!session) return

      const isHost = session.hostSocketId === socket.id
      if (!isHost && !seatId) return

      for (const c of changes) {
        updateControlValue(session, { seatId, controlId: c[0], value: c[1], valueY: c[2] })
      }

      const room = isHost ? `seat:${sessionId}:${seatId}` : `host:${sessionId}`
      const members = io.sockets.adapter.rooms.get(room)
      console.log(`control:batch from ${isHost ? "host" : "client"}, room: ${room}, members: ${members?.size || 0}`)

      if (isHost) socket.to(`seat:${sessionId}:${seatId}`).emit("control:batch", { seatId, changes })
      else io.to(`host:${sessionId}`).emit("control:batch", { seatId, changes })
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
