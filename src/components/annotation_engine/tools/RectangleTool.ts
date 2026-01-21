import { normalizeRect } from "~components/annotation_engine/engine/utils"
import type { Tool, ToolConfigSchemaType } from "../engine/Tool";
import type { Point, RectAnnotation } from "../engine/types";

interface RectangleDrawingState {
  start: Point
  end: Point
}

export class RectangleTool implements Tool {
  type = "rectangle"

  onPointerDown(p: Point): RectangleDrawingState {
    return {
      start: p,
      end: p
    }
  }

  onPointerMove(p: Point, drawingState: RectangleDrawingState) {
    if (drawingState) {
      drawingState.end = p
    }
  }

  onPointerUp(p: Point, drawingState?: RectangleDrawingState): RectAnnotation | null {
    if (!drawingState) return null

    return {
      id: crypto.randomUUID(),
      type: "rectangle",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  getPreview(drawingState: RectangleDrawingState): RectAnnotation | null {
    if (!drawingState) return null

    return {
      id: "preview",
      type: "rectangle",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: RectAnnotation) {
    const r = normalizeRect(a.start, a.end)

    if (a.fill && a.fill !== "transparent") {
      ctx.fillStyle = a.fill
      ctx.fillRect(r.x, r.y, r.width, r.height)
    }

    ctx.strokeStyle = a.stroke || "#00ff00"
    ctx.lineWidth = a.strokeWidth || 2
    ctx.strokeRect(r.x, r.y, r.width, r.height)
  }

  hitTest(a: RectAnnotation, p: Point) {
    const r = normalizeRect(a.start, a.end)
    return (
      p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
    )
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Stroke", type: "color" as ToolConfigSchemaType },
      // { key: "fill", label: "Fill", type: "color" as ToolConfigSchemaType },
      { key: "strokeWidth", label: "Width", type: "number" as ToolConfigSchemaType, min: 1, max: 10 }
    ]
  }
}
