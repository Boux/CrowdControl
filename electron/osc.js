import osc from "osc"

export function createOscClient(config) {
  const { host, port, protocol } = config

  if (protocol === "tcp") {
    const client = new osc.TCPSocketPort({
      address: host,
      port: port
    })
    client.open()
    client.on("error", err => console.error("OSC TCP error:", err))
    return client
  }

  const client = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 0,
    remoteAddress: host,
    remotePort: port
  })
  client.open()
  client.on("error", err => console.error("OSC UDP error:", err))
  return client
}

export function sendOsc(client, address, args) {
  client.send({ address, args: Array.isArray(args) ? args : [args] })
}

export function closeOscClient(client) {
  client?.close()
}
