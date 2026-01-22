import type { Tool, ToolConfigSchemaType } from "../engine/Tool"
import type { Point, TextAnnotation } from "../engine/types"

interface TextDrawingState {
  position: Point
  text?: string
}

export class TextTool implements Tool {
  type = "text"

  // Text editing state
  private isEditing: boolean = false
  private editingAnnotation: TextAnnotation | null = null
  private inputPosition: Point | null = null
  private inputText: string = ""

  onPointerDown(p: Point): TextDrawingState {
    return {
      position: p,
      text: ""
    }
  }

  onPointerMove(p: Point, drawingState?: TextDrawingState) {
    // Text tool doesn't need movement tracking
  }

  onPointerUp(p: Point, drawingState?: TextDrawingState): TextAnnotation | null {
    if (!drawingState) return null

    return {
      id: crypto.randomUUID(),
      fontFamily: "",
      fontSize: 0,
      type: "text",
      position: drawingState.position,
      text: drawingState.text || ""
    }
  }

  getPreview(drawingState: TextDrawingState): TextAnnotation | null {
    if (!drawingState || !drawingState.text) return null

    return {
      id: "preview",
      fontFamily: "",
      fontSize: 0,
      type: "text",
      position: drawingState.position,
      text: drawingState.text
    }
  }

  draw(ctx: CanvasRenderingContext2D, a: TextAnnotation) {
    ctx.fillStyle = a.stroke || "#000"
    ctx.font = `${a.fontSize || 16}px ${a.fontFamily || "Arial"}`

    // For preview, use placeholder text if no text provided
    const text = a.id === "preview" && !a.text ? "Type text..." : a.text || ""
    ctx.fillText(text, a.position.x, a.position.y)
  }

  hitTest(a: TextAnnotation, p: Point) {
    const text = a.text || ""
    const fontSize = a.fontSize || 16

    // Estimate text dimensions (rough approximation)
    const textWidth = text.length * fontSize * 0.6
    const textHeight = fontSize

    return (
      p.x >= a.position.x &&
      p.x <= a.position.x + textWidth &&
      p.y <= a.position.y &&
      p.y >= a.position.y - textHeight
    )
  }

  // Text editing methods
  startTextEditing(position: Point, annotation?: TextAnnotation): boolean {
    if (this.isEditing) return false

    this.isEditing = true
    this.editingAnnotation = annotation || null
    this.inputPosition = position
    this.inputText = annotation?.text || ""

    return true
  }

  finishTextEditing(text: string): TextAnnotation | null {
    if (!this.isEditing || !this.inputPosition) return null

    const trimmedText = text.trim()
    if (!trimmedText) return null

    if (this.editingAnnotation) {
      // Update existing annotation
      this.editingAnnotation.text = trimmedText
      return this.editingAnnotation
    } else {
      // Create new annotation
      return {
        id: crypto.randomUUID(),
        fontFamily: "",
        fontSize: 0,
        type: "text",
        position: this.inputPosition,
        text: trimmedText
      }
    }
  }

  cancelTextEditing(): void {
    this.isEditing = false
    this.editingAnnotation = null
    this.inputPosition = null
    this.inputText = ""
  }

  updatePreviewText(text: string): void {
    this.inputText = text
  }

  getEditText(position: Point): TextAnnotation | null {
    // This method would be used by the engine to find existing text at a position
    // For now, return null - this will be enhanced when we implement text selection
    return null
  }

  // State accessors
  getIsEditing(): boolean {
    return this.isEditing
  }

  getEditingAnnotation(): TextAnnotation | null {
    return this.editingAnnotation
  }

  getInputPosition(): Point | null {
    return this.inputPosition
  }

  getInputText(): string {
    return this.inputText
  }

  getConfigSchema() {
    return [
      { key: "stroke", label: "Color", type: "color" as ToolConfigSchemaType },
      { key: "fontSize", label: "Font Size", type: "number" as ToolConfigSchemaType, min: 10, max: 64 },
      { key: "fontFamily", label: "Font Family", type: "text" as ToolConfigSchemaType }
    ]
  }
}
