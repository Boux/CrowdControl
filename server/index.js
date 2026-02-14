import express from "express"
import { createServer } from "https"
import selfsigned from "selfsigned"
import { fileURLToPath } from "url"
import { dirname, join } from "path"
import { attachRelay } from "./relay.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

const { private: key, cert } = await selfsigned.generate([{ name: "commonName", value: "localhost" }], { days: 365 })
const app = express()
const server = createServer({ key, cert }, app)

attachRelay(server)

const distPath = join(__dirname, "..", "dist")
app.use(express.static(distPath))
app.get("*", (req, res) => res.sendFile(join(distPath, "index.html")))

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Crowd Control server on port ${PORT} (https)`))
