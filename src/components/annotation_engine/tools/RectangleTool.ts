import { normalizeRect } from "~components/annotation_engine/engine/utils"



import type { Tool, ToolConfigSchemaType } from "../engine/Tool";
import type { Point, RectAnnotation } from "../engine/types";


export class RectangleTool implements Tool {
  type = "rectangle"
  private start?: Point
  private end?: Point

  onPointerDown(p: Point) {
    this.start = p
    this.end = p
  }

  onPointerMove(p: Point) {
    this.end = p
  }

  onPointerUp(): RectAnnotation | null {
    if (!this.start || !this.end) return null

    return {
      id: crypto.randomUUID(),
      type: "rectangle",
      start: this.start,
      end: this.end,
      stroke: "#00ff00",
      strokeWidth: 2,
      fill: "rgba(0,255,0,0.1)"
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: RectAnnotation) {
    const r = normalizeRect(a.start, a.end)

    if (a.fill) {
      ctx.fillStyle = a.fill
      ctx.fillRect(r.x, r.y, r.width, r.height)
    }

    ctx.strokeStyle = a.stroke
    ctx.lineWidth = a.strokeWidth
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
      { key: "fill", label: "Fill", type: "color" as ToolConfigSchemaType },
      { key: "strokeWidth", label: "Width", type: "number" as ToolConfigSchemaType, min: 1, max: 10 }
    ]
  }
}
