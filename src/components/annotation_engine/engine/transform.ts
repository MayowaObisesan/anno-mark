import type { Handle } from "./selection"
import type { Annotation, Point } from "./types"

export function moveAnnotation(a: Annotation, dx: number, dy: number) {
  switch (a.type) {
    case "arrow":
      a.start.x += dx
      a.start.y += dy
      a.end.x += dx
      a.end.y += dy
      break

    case "rectangle":
    case "ellipse":
      a.start.x += dx
      a.start.y += dy
      a.end.x += dx
      a.end.y += dy
      break

    case "freehand":
      a.points.forEach((p) => {
        p.x += dx
        p.y += dy
      })
      break

    case "text":
      a.position.x += dx
      a.position.y += dy
      break
  }
}

export function resizeAnnotation(
  a: Annotation,
  handle: Handle,
  dx: number,
  dy: number
) {
  if (a.type === "freehand") return

  if ("start" in a && "end" in a) {
    if (handle?.includes("n")) a.start.y += dy
    if (handle?.includes("s")) a.end.y += dy
    if (handle?.includes("w")) a.start.x += dx
    if (handle?.includes("e")) a.end.x += dx
  }

  if (a.type === "text") {
    a.fontSize = Math.max(8, a.fontSize + dy * -0.1)
  }
}
