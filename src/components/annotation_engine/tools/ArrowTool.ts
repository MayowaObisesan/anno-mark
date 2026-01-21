import { distance } from "~components/annotation_engine/engine/utils"
import type { Tool, ToolConfigSchemaType } from "../engine/Tool";
import type { ArrowAnnotation, Point } from "../engine/types";

export class ArrowTool implements Tool {
  type = "arrow"
  private start: Point | null = null
  private end: Point | null = null

  onPointerDown(p: Point) {
    this.start = p
    this.end = p
  }

  onPointerMove(p: Point) {
    this.end = p
  }

  onPointerUp(): ArrowAnnotation | null {
    if (!this.start || !this.end) return null

    return {
      id: crypto.randomUUID(),
      type: "arrow",
      start: this.start,
      end: this.end,
      stroke: "#ff0000",
      strokeWidth: 2
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: ArrowAnnotation) {
    ctx.strokeStyle = a.stroke
    ctx.lineWidth = a.strokeWidth

    ctx.beginPath()
    ctx.moveTo(a.start.x, a.start.y)
    ctx.lineTo(a.end.x, a.end.y)
    ctx.stroke()

    // Proportional arrow head
    const headLength = Math.max(10, (a.strokeWidth || 2) * 4)
    const angle = Math.atan2(a.end.y - a.start.y, a.end.x - a.start.x)

    // const size = 10 // No longer needed, now using headLength for dynamic scaling.
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
    ctx.fillStyle = a.stroke
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
