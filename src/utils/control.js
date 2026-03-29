import { layoutDefaults } from "./layout.js"
import { createControl } from "../models/index.js"
import { MIDI_CHANNELS, MIDI_CC_MAX } from "../constants.js"

export function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

export function collectUsedMidi(seats) {
  const used = new Set()
  for (const seat of seats)
    for (const c of seat.controls)
      for (const { ch, cc } of c.getAllCCValues())
        used.add(`${ch}:${cc}`)
  return used
}

export function nextMidiSlot(usedMidi) {
  for (let ch = 0; ch < MIDI_CHANNELS; ch++)
    for (let cc = 0; cc <= MIDI_CC_MAX; cc++)
      if (!usedMidi.has(`${ch}:${cc}`)) return { ch, cc }
  return { ch: 0, cc: 0 }
}

export function assignMidi(control, usedMidi) {
  for (const key of control.valueKeys) {
    if (control.cc_num[key] == null) continue
    const slot = nextMidiSlot(usedMidi)
    control.cc_num[key] = slot.cc
    control.channel = slot.ch
    usedMidi.add(`${slot.ch}:${slot.cc}`)
  }
}

export function collectUsedAddresses(seats) {
  const used = new Set()
  for (const seat of seats)
    for (const c of seat.controls)
      if (c.oscAddress) used.add(c.oscAddress)
  return used
}

export function nextAddress(base, usedAddresses) {
  if (!usedAddresses.has(base)) { usedAddresses.add(base); return base }
  const stem = base.replace(/\d*$/, "")
  for (let n = 2; ; n++) {
    const addr = stem + n
    if (!usedAddresses.has(addr)) { usedAddresses.add(addr); return addr }
  }
}

export function buildControl(type, seatName, existingControls, usedMidi) {
  const baseName = nameToSlug(seatName)
  const count = existingControls.filter(c => c.type === type).length + 1

  const slot1 = nextMidiSlot(usedMidi)
  usedMidi.add(`${slot1.ch}:${slot1.cc}`)

  const base = {
    "xy-pad": () => {
      const slot2 = nextMidiSlot(usedMidi)
      usedMidi.add(`${slot2.ch}:${slot2.cc}`)
      return { label: "XY Pad", oscAddress: `/${baseName}/xy${count}`, cc_num: { x: slot1.cc, y: slot2.cc }, channel: slot1.ch }
    },
    "fader": () => ({ label: "Fader", oscAddress: `/${baseName}/fader${count}`, cc_num: { value: slot1.cc }, channel: slot1.ch, orientation: "vertical" }),
    "button": () => ({ label: "Button", oscAddress: `/${baseName}/button${count}`, cc_num: { value: slot1.cc }, channel: slot1.ch, onValue: 1, offValue: 0 }),
    "toggle": () => ({ label: "Toggle", oscAddress: `/${baseName}/toggle${count}`, cc_num: { value: slot1.cc }, channel: slot1.ch, onValue: 1, offValue: 0 })
  }

  return createControl({ type, ...base[type](), ...layoutDefaults[type] })
}
