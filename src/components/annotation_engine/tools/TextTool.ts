import type { Tool, ToolConfigSchemaType } from "../engine/Tool"
import type { Point, TextAnnotation } from "../engine/types";


export class TextTool implements Tool {
  type = "text"
  private position?: Point

  onPointerDown(p: Point) {
    this.position = p
  }

  onPointerMove() {}

  onPointerUp(): TextAnnotation | null {
    if (!this.position) return null

    const text = prompt("Enter text")
    if (!text) return null

    return {
      id: crypto.randomUUID(),
      type: "text",
      position: this.position,
      text,
      stroke: "#000",
      strokeWidth: 1,
      fontSize: 16,
      fontFamily: "Arial"
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: TextAnnotation) {
    ctx.fillStyle = a.stroke
    ctx.font = `${a.fontSize}px ${a.fontFamily}`
    ctx.fillText(a.text, a.position.x, a.position.y)
  }

  hitTest(a: TextAnnotation, p: Point) {
    const width = a.text.length * a.fontSize * 0.6
    const height = a.fontSize
    return (
      p.x >= a.position.x &&
      p.x <= a.position.x + width &&
      p.y <= a.position.y &&
      p.y >= a.position.y - height
    )
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Color", type: "color" as ToolConfigSchemaType },
      { key: "fontSize", label: "Font Size", type: "number" as ToolConfigSchemaType, min: 10, max: 64 }
    ]
  }
}
