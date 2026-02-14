import express from "express"
import { createServer } from "http"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { attachRelay } from "./relay.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const server = createServer(app)

attachRelay(server)

// Serve built web app
const distPath = join(__dirname, "..", "dist")
app.use(express.static(distPath))
app.get("*", (req, res) => res.sendFile(join(distPath, "index.html")))

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Crowd Control server on port ${PORT}`))
