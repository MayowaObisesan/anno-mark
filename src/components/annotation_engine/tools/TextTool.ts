import type { Tool, ToolConfigSchemaType } from "../engine/Tool"
import type { Point, TextAnnotation } from "../engine/types";

interface TextDrawingState {
  position: Point
  text?: string
}

export class TextTool implements Tool {
  type = "text"

  onPointerDown(p: Point): TextDrawingState {
    return {
      position: p
    }
  }

  onPointerMove(p: Point, drawingState: TextDrawingState) {
    // Text tool doesn't need movement tracking
  }

  onPointerUp(p: Point, drawingState?: TextDrawingState): TextAnnotation | null {
    if (!drawingState) return null

    const text = prompt("Enter text")
    if (!text) return null

    return {
      id: crypto.randomUUID(),
      type: "text",
      position: drawingState.position,
      fontFamily: "",
      fontSize: 0,
      text,
    }
  }

  getPreview(drawingState: TextDrawingState): TextAnnotation | null {
    if (!drawingState) return null

    return {
      id: "preview",
      type: "text",
      position: drawingState.position,
      text: "Text...",
      fontFamily: "",
      fontSize: 0,
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: TextAnnotation) {
    ctx.fillStyle = a.stroke || "#000"
    ctx.font = `${a.fontSize || 16}px ${a.fontFamily || "Arial"}`

    // For preview, use placeholder text
    const text = a.id === "preview" ? "Text..." : a.text
    ctx.fillText(text, a.position.x, a.position.y)
  }

  hitTest(a: TextAnnotation, p: Point) {
    const text = a.id === "preview" ? "Text..." : a.text
    const fontSize = a.fontSize || 16
    const width = text.length * fontSize * 0.6
    const height = fontSize

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
      { key: "fontSize", label: "Font Size", type: "number" as ToolConfigSchemaType, min: 10, max: 64 },
      { key: "fontFamily", label: "Font Family", type: "text" as ToolConfigSchemaType }
    ]
  }
}
