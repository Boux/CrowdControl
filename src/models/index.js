import Control from "./Control.js"
import Fader from "./Fader.js"
import XYPad from "./XYPad.js"
import Button from "./Button.js"

const TYPES = {
  fader: Fader,
  "xy-pad": XYPad,
  button: Button,
  toggle: Button
}

export function createControl(data) {
  const Cls = TYPES[data.type] || Control
  return new Cls(data)
}

export function hydrateSeats(seats) {
  for (const seat of seats)
    seat.controls = (seat.controls || []).map(c => c instanceof Control ? c : createControl(c))
  return seats
}

export { Control, Fader, XYPad, Button }
