import type {
  Annotation,
  ArrowAnnotation,
  EllipseAnnotation,
  FreehandAnnotation,
  RectAnnotation,
  TextAnnotation
} from "./types"

export function getBounds(a: Annotation) {
  switch (a.type) {
    case "rectangle":
    case "ellipse": {
      const r = normalize(a.start, a.end)
      return r
    }

    case "arrow": {
      return normalize(a.start, a.end)
    }

    case "freehand": {
      const xs = a.points.map((p) => p.x)
      const ys = a.points.map((p) => p.y)
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys)
      }
    }

    case "text": {
      return {
        x: a.position.x,
        y: a.position.y - a.fontSize,
        width: a.text.length * a.fontSize * 0.6,
        height: a.fontSize
      }
    }
  }
}

function normalize(a: any, b: any) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y)
  }
}
