import Control from "./Control.js"

export default class Button extends Control {
  constructor(data) {
    super({ ...data, type: data.type || "button" })
    this.onValue = data.onValue ?? 1
    this.offValue = data.offValue ?? 0
    if (!("value" in this.values)) this.values.value = 0
  }

  get valueKeys() { return ["value"] }

  setValues(input, interp, onTick) {
    super.setValues(input, 0, onTick)
  }

  _normalize(val) { return val > 0 ? 1 : 0 }

  toJSON() { return { ...super.toJSON(), onValue: this.onValue, offValue: this.offValue } }
}
