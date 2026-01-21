import { distance } from "~components/annotation_engine/engine/utils"
import type { Tool, ToolConfigSchemaType } from "../engine/Tool";
import type { ArrowAnnotation, Point } from "../engine/types";

interface ArrowDrawingState {
  start: Point
  end: Point
}

export class ArrowTool implements Tool {
  type = "arrow"

  onPointerDown(p: Point): ArrowDrawingState {
    return {
      start: p,
      end: p
    }
  }

  onPointerMove(p: Point, drawingState: ArrowDrawingState) {
    if (drawingState) {
      drawingState.end = p
    }
  }

  onPointerUp(p: Point, drawingState?: ArrowDrawingState): ArrowAnnotation | null {
    if (!drawingState) return null

    return {
      id: crypto.randomUUID(),
      type: "arrow",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  getPreview(drawingState: ArrowDrawingState): ArrowAnnotation | null {
    if (!drawingState) return null

    return {
      id: "preview",
      type: "arrow",
      start: drawingState.start,
      end: drawingState.end
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: ArrowAnnotation) {
    ctx.strokeStyle = a.stroke || "#ff0000"
    ctx.lineWidth = a.strokeWidth || 2

    ctx.beginPath()
    ctx.moveTo(a.start.x, a.start.y)
    ctx.lineTo(a.end.x, a.end.y)
    ctx.stroke()

    // Proportional arrow head
    const headLength = Math.max(10, (a.strokeWidth || 2) * 4)
    const angle = Math.atan2(a.end.y - a.start.y, a.end.x - a.start.x)

    ctx.beginPath()
    ctx.moveTo(a.end.x, a.end.y)
    ctx.lineTo(
      a.end.x - headLength * Math.cos(angle - Math.PI / 6),
      a.end.y - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.lineTo(
      a.end.x - headLength * Math.cos(angle + Math.PI / 6),
      a.end.y - headLength * Math.sin(angle + Math.PI / 6)
    )
    ctx.closePath()
    ctx.fillStyle = a.stroke || "#ff0000"
    ctx.fill()
  }

  hitTest(a: ArrowAnnotation, p: Point) {
    const d =
      distance(a.start, p) +
      distance(p, a.end) -
      distance(a.start, a.end)

    return Math.abs(d) < 5
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Color", type: "color" as ToolConfigSchemaType },
      { key: "strokeWidth", label: "Width", type: "number" as ToolConfigSchemaType, min: 1, max: 10 }
    ]
  }
}
