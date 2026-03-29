import { VALUE_DECIMALS, INTERP_TICK_RATE, MAX_INTERP_DURATION } from "../constants.js"

const factor = Math.pow(10, VALUE_DECIMALS)
const r = v => Math.round(v * factor) / factor

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
    this.interpolatedValues = null
    this._interpInterval = null
    this._interpStart = 0
    this._interpDuration = 0
    this._interpFrom = {}
    this._onTick = null
    this.x = data.x
    this.y = data.y
    this.w = data.w
    this.h = data.h
  }

  get valueKeys() { return ["value"] }

  setValues(input, interp, onTick) {
    if (typeof input === "number") {
      this.values[this.valueKeys[0]] = input
    } else if (Array.isArray(input)) {
      this.valueKeys.forEach((k, i) => { if (input[i] !== undefined) this.values[k] = input[i] })
    } else {
      Object.assign(this.values, input)
    }

    if (!this.interpolatedValues) this.interpolatedValues = { ...this.values }

    if (!interp) {
      this.stopInterp()
      Object.assign(this.interpolatedValues, this.values)
      return
    }

    this._interpFrom = { ...this.interpolatedValues }
    this._interpStart = Date.now()
    this._interpDuration = Math.min(interp, MAX_INTERP_DURATION)
    this._onTick = onTick

    if (!this._interpInterval) {
      this._interpInterval = setInterval(() => this._tick(), INTERP_TICK_RATE)
    }
  }

  _tick() {
    const t = Math.min(1, (Date.now() - this._interpStart) / this._interpDuration)
    for (const k of this.valueKeys)
      this.interpolatedValues[k] = this._interpFrom[k] + (this.values[k] - this._interpFrom[k]) * t
    if (this._onTick) this._onTick(this)
    if (t >= 1) this.stopInterp()
  }

  stopInterp() {
    if (this._interpInterval) {
      clearInterval(this._interpInterval)
      this._interpInterval = null
    }
  }

  getOSCArgs() {
    const v = this.interpolatedValues || this.values
    return this.valueKeys.map(k => v[k] ?? 0)
  }

  getAllCCValues() {
    const v = this.interpolatedValues || this.values
    const result = []
    for (const key of this.valueKeys) {
      if (this.cc_num[key] == null) continue
      result.push({ ch: this.channel, cc: this.cc_num[key], value: this._normalize(v[key] ?? 0) })
    }
    return result
  }

  _normalize(val) {
    return (val - this.min) / (this.max - this.min)
  }

  toWire(interp) {
    const vals = this.valueKeys.map(k => r(this.values[k] ?? 0))
    const wire = [this.id, vals.length === 1 ? vals[0] : vals]
    if (interp) wire.push(interp)
    return wire
  }

  static fromWire(arr, control, onTick) {
    const interp = arr[2] || 0
    control.setValues(Array.isArray(arr[1]) ? arr[1] : [arr[1]], interp, onTick)
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
