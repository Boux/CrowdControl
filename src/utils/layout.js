export const layoutDefaults = {
  "xy-pad": { x: 10, y: 30, w: 80, h: 40 },
  "fader": { x: 35, y: 20, w: 30, h: 60 },
  "button": { x: 30, y: 42, w: 40, h: 15 },
  "toggle": { x: 30, y: 44, w: 40, h: 12 }
}

export function controlBounds(c) {
  const d = layoutDefaults[c.type] || { x: 10, y: 10, w: 80, h: 20 }
  return {
    x: c.x ?? d.x,
    y: c.y ?? d.y,
    w: c.w ?? d.w,
    h: c.h ?? d.h
  }
}

export function controlStyle(c, index) {
  const b = controlBounds(c)
  return {
    position: "absolute",
    left: `${b.x}%`,
    top: `${b.y}%`,
    width: `${b.w}%`,
    height: `${b.h}%`,
    zIndex: index
  }
}
