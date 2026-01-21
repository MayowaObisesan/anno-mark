import type {
  Tool,
  ToolConfigSchemaType
} from "~components/annotation_engine/engine/Tool"
import type { FreehandAnnotation, Point } from "~components/annotation_engine/engine/types";
import { distance } from "~components/annotation_engine/engine/utils";

interface FreehandDrawingState {
  points: Point[]
}

export class FreehandTool implements Tool {
  type = "freehand"

  onPointerDown(p: Point): FreehandDrawingState {
    return {
      points: [p]
    }
  }

  onPointerMove(p: Point, drawingState: FreehandDrawingState) {
    if (drawingState && drawingState.points.length > 0) {
      const last = drawingState.points[drawingState.points.length - 1]
      if (!last || distance(last, p) > 2) {
        drawingState.points.push(p)
      }
    }
  }

  onPointerUp(p: Point, drawingState?: FreehandDrawingState): FreehandAnnotation | null {
    if (!drawingState || drawingState.points.length < 2) return null

    return {
      id: crypto.randomUUID(),
      type: "freehand",
      points: [...drawingState.points]
    }
  }

  getPreview(drawingState: FreehandDrawingState): FreehandAnnotation | null {
    if (!drawingState || drawingState.points.length < 2) return null

    return {
      id: "preview",
      type: "freehand",
      points: [...drawingState.points]
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: FreehandAnnotation) {
    ctx.strokeStyle = a.stroke || "#000"
    ctx.lineWidth = a.strokeWidth || 2
    ctx.lineJoin = "round"
    ctx.lineCap = "round"

    ctx.beginPath()
    a.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  }

  hitTest(a: FreehandAnnotation, p: Point) {
    return a.points.some((pt) => distance(pt, p) < 5)
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Color", type: "color" as ToolConfigSchemaType },
      { key: "strokeWidth", label: "Width", type: "number" as ToolConfigSchemaType, min: 1, max: 10 }
    ]
  }
}
