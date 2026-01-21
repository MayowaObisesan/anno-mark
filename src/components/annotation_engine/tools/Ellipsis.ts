import type {
  Tool,
  ToolConfigSchemaType
} from "~components/annotation_engine/engine/Tool"
import type { EllipseAnnotation, Point } from "~components/annotation_engine/engine/types";
import { normalizeRect } from "~components/annotation_engine/engine/utils";





export class EllipseTool implements Tool {
  type = "ellipse"
  private start?: Point
  private end?: Point

  onPointerDown(p: Point) {
    this.start = p
    this.end = p
  }

  onPointerMove(p: Point) {
    this.end = p
  }

  onPointerUp(): EllipseAnnotation | null {
    if (!this.start || !this.end) return null

    return {
      id: crypto.randomUUID(),
      type: "ellipse",
      start: this.start,
      end: this.end,
      stroke: "#0000ff",
      strokeWidth: 2,
      fill: "rgba(0,0,255,0.1)"
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

    if (a.fill) {
      ctx.fillStyle = a.fill
      ctx.fill()
    }

    ctx.strokeStyle = a.stroke
    ctx.lineWidth = a.strokeWidth
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
