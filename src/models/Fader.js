import Control from "./Control.js"

export default class Fader extends Control {
  constructor(data) {
    super({ ...data, type: "fader" })
    this.orientation = data.orientation || "vertical"
    if (!("value" in this.values)) this.values.value = 0
  }

  get valueKeys() { return ["value"] }

  toJSON() { return { ...super.toJSON(), orientation: this.orientation } }
}
