import type {
  Tool,
  ToolConfigSchemaType
} from "~components/annotation_engine/engine/Tool"
import type { EllipseAnnotation, Point } from "~components/annotation_engine/engine/types";
import { normalizeRect } from "~components/annotation_engine/engine/utils";

interface EllipseDrawingState {
  start: Point
  end: Point
}

export class EllipseTool implements Tool {
  type = "ellipse"

  onPointerDown(p: Point): EllipseDrawingState {
    return {
      start: p,
      end: p
    }
  }

  onPointerMove(p: Point, drawingState: EllipseDrawingState) {
    if (drawingState) {
      drawingState.end = p
    }
  }

  onPointerUp(p: Point, drawingState?: EllipseDrawingState): EllipseAnnotation | null {
    if (!drawingState) return null

    return {
      id: crypto.randomUUID(),
      type: "ellipse",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  getPreview(drawingState: EllipseDrawingState): EllipseAnnotation | null {
    if (!drawingState) return null

    return {
      id: "preview",
      type: "ellipse",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: EllipseAnnotation) {
    const r = normalizeRect(a.start, a.end)

    ctx.beginPath()
    ctx.ellipse(
      r.x + r.width / 2,
      r.y + r.height / 2,
      r.width / 2,
      r.height / 2,
      0,
      0,
      Math.PI * 2
    )

    if (a.fill && a.fill !== "transparent") {
      ctx.fillStyle = a.fill
      ctx.fill()
    }

    ctx.strokeStyle = a.stroke || "#0000ff"
    ctx.lineWidth = a.strokeWidth || 2
    ctx.stroke()
  }

  hitTest(a: EllipseAnnotation, p: Point) {
    const r = normalizeRect(a.start, a.end)
    const cx = r.x + r.width / 2
    const cy = r.y + r.height / 2

    const dx = (p.x - cx) / (r.width / 2)
    const dy = (p.y - cy) / (r.height / 2)

    return dx * dx + dy * dy <= 1
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Stroke", type: "color" as ToolConfigSchemaType },
      { key: "fill", label: "Fill", type: "color" as ToolConfigSchemaType },
      { key: "strokeWidth", label: "Width", type: "number" as ToolConfigSchemaType, min: 1, max: 10 }
    ]
  }
}
