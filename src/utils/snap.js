import { controlBounds } from "./layout.js"

export function snapValue(val, targets, threshold) {
  let best = null, bestDist = threshold
  for (const t of targets) {
    const dist = Math.abs(val - t)
    if (dist < bestDist) { best = t; bestDist = dist }
  }
  return best
}

export function getSnapEdges(controls, excludeIds) {
  const edges = { x: [0, 100], y: [0, 100] }
  for (const c of controls) {
    if (excludeIds.has(c.id)) continue
    const b = controlBounds(c)
    edges.x.push(b.x, b.x + b.w)
    edges.y.push(b.y, b.y + b.h)
  }
  return edges
}
