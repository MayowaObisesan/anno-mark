import type { Handle } from "./selection"
import type { Point } from "./types"

const SIZE = 6

export function getHandles(bounds: {
  x: number
  y: number
  width: number
  height: number
}) {
  const { x, y, width, height } = bounds

  return {
    nw: { x, y },
    n: { x: x + width / 2, y },
    ne: { x: x + width, y },
    e: { x: x + width, y: y + height / 2 },
    se: { x: x + width, y: y + height },
    s: { x: x + width / 2, y: y + height },
    sw: { x, y: y + height },
    w: { x, y: y + height / 2 }
  }
}

export function hitHandle(p: Point, handles: any): Handle {
  for (const key in handles) {
    const h = handles[key]
    if (Math.abs(p.x - h.x) <= SIZE && Math.abs(p.y - h.y) <= SIZE) {
      return key as Handle
    }
  }
  return null
}

export function drawHandles(ctx: CanvasRenderingContext2D, handles: any) {
  ctx.fillStyle = "#fff"
  ctx.strokeStyle = "#000"

  Object.values(handles).forEach((h: any) => {
    ctx.beginPath()
    ctx.rect(h.x - SIZE / 2, h.y - SIZE / 2, SIZE, SIZE)
    ctx.fill()
    ctx.stroke()
  })
}
