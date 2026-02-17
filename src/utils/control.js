import { layoutDefaults } from "./layout.js"

export function nameToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
}

export function collectUsedMidi(seats) {
  const used = new Set()
  for (const seat of seats)
    for (const c of seat.controls) {
      if (c.midiCC !== undefined) used.add(`${c.midiChannel || 0}:${c.midiCC}`)
      if (c.midiCCY !== undefined) used.add(`${c.midiChannel || 0}:${c.midiCCY}`)
    }
  return used
}

export function nextMidiSlot(usedMidi) {
  for (let ch = 0; ch < 16; ch++)
    for (let cc = 0; cc < 128; cc++)
      if (!usedMidi.has(`${ch}:${cc}`)) return { ch, cc }
  return { ch: 0, cc: 0 }
}

export function assignMidi(control, usedMidi) {
  if (control.midiCC === undefined) return
  const slot = nextMidiSlot(usedMidi)
  control.midiChannel = slot.ch
  control.midiCC = slot.cc
  usedMidi.add(`${slot.ch}:${slot.cc}`)
  if (control.midiCCY !== undefined) {
    const slotY = nextMidiSlot(usedMidi)
    control.midiCCY = slotY.cc
    if (control.midiChannel !== slotY.ch) control.midiChannel = slotY.ch
    usedMidi.add(`${slotY.ch}:${slotY.cc}`)
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
  const slot = nextMidiSlot(usedMidi)
  const midi = { midiChannel: slot.ch, midiCC: slot.cc }
  usedMidi.add(`${slot.ch}:${slot.cc}`)
  if (type === "xy-pad") {
    const slotY = nextMidiSlot(usedMidi)
    midi.midiCCY = slotY.cc
    usedMidi.add(`${slotY.ch}:${slotY.cc}`)
  }
  const defaults = {
    "xy-pad": { label: "XY Pad", oscAddress: `/${baseName}/xy${count}`, min: 0, max: 1, value: 0.5, valueY: 0.5 },
    "fader": { label: "Fader", oscAddress: `/${baseName}/fader${count}`, min: 0, max: 1, value: 0, orientation: "vertical" },
    "button": { label: "Button", oscAddress: `/${baseName}/button${count}`, onValue: 1, offValue: 0 },
    "toggle": { label: "Toggle", oscAddress: `/${baseName}/toggle${count}`, onValue: 1, offValue: 0, value: 0 }
  }
  return { type, ...defaults[type], ...layoutDefaults[type], ...midi }
}
