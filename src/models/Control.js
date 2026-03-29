const r = v => Math.round(v * 1000) / 1000

export default class Control {
  constructor(data) {
    this.id = data.id
    this.type = data.type
    this.label = data.label || ""
    this.oscAddress = data.oscAddress || ""
    this.min = data.min ?? 0
    this.max = data.max ?? 1
    this.channel = data.channel ?? 0
    this.cc_num = data.cc_num ? { ...data.cc_num } : {}
    this.values = data.values ? { ...data.values } : {}
    this.x = data.x
    this.y = data.y
    this.w = data.w
    this.h = data.h
  }

  get valueKeys() { return ["value"] }

  setValues(input) {
    if (typeof input === "number") {
      this.values[this.valueKeys[0]] = input
    } else if (Array.isArray(input)) {
      this.valueKeys.forEach((k, i) => { if (input[i] !== undefined) this.values[k] = input[i] })
    } else {
      Object.assign(this.values, input)
    }
  }

  getOSCArgs() {
    return this.valueKeys.map(k => this.values[k] ?? 0)
  }

  getAllCCValues() {
    const result = []
    for (const key of this.valueKeys) {
      if (this.cc_num[key] == null) continue
      result.push({ ch: this.channel, cc: this.cc_num[key], value: this._normalize(this.values[key] ?? 0) })
    }
    return result
  }

  _normalize(val) {
    return (val - this.min) / (this.max - this.min)
  }

  toWire() {
    const vals = this.valueKeys.map(k => r(this.values[k] ?? 0))
    return [this.id, vals.length === 1 ? vals[0] : vals]
  }

  static fromWire(arr, control) {
    control.setValues(Array.isArray(arr[1]) ? arr[1] : [arr[1]])
  }

  clone() {
    return new this.constructor(this.toJSON())
  }

  toJSON() {
    const obj = {
      id: this.id, type: this.type, label: this.label,
      oscAddress: this.oscAddress, min: this.min, max: this.max,
      channel: this.channel, cc_num: { ...this.cc_num }, values: { ...this.values }
    }
    if (this.x !== undefined) { obj.x = this.x; obj.y = this.y; obj.w = this.w; obj.h = this.h }
    return obj
  }
}
