import easymidi from "easymidi"

let output = null

export function getOutputs() {
  return easymidi.getOutputs()
}

export function connectMidi(deviceName) {
  closeMidi()
  output = new easymidi.Output(deviceName)
  return { success: true }
}

export function sendCC(channel, controller, value) {
  if (!output) return
  output.send("cc", { channel, controller, value })
}

export function closeMidi() {
  if (!output) return
  output.close()
  output = null
}
