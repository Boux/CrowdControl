import Control from "./Control.js"

export default class XYPad extends Control {
  constructor(data) {
    super({ ...data, type: "xy-pad" })
    if (!("x" in this.values)) this.values.x = 0.5
    if (!("y" in this.values)) this.values.y = 0.5
  }

  get valueKeys() { return ["x", "y"] }
}
