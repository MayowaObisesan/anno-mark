import { clearCanvas, renderAnnotations } from "./engine/renderer";
import type { Annotation, Point, ToolType } from "./engine/types";
import { ArrowTool } from "./tools/ArrowTool";
import { RectangleTool } from "~components/annotation_engine/tools/RectangleTool"
import { EllipseTool } from "~components/annotation_engine/tools/Ellipsis"
import { FreehandTool } from "~components/annotation_engine/tools/FreehandTool"
import { TextTool } from "~components/annotation_engine/tools/TextTool"
import type { SelectionState } from './engine/selection'
import { getBounds } from './engine/bounds'
import { getHandles, hitHandle, drawHandles } from './engine/handles'
import { moveAnnotation, resizeAnnotation } from './engine/transform'

export class AnnotationEngine {
  private readonly ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private annotations: Annotation[] = []
  private activeTool: ToolType = "arrow"
  private backgroundImage: HTMLImageElement | null = null

  // Preview state for real-time drawing
  private isDrawing: boolean = false
  private currentPreview: Annotation | null = null
  private drawingState: any = null

  // Text editing state
  private isTextEditing: boolean = false
  private textEditingPosition: Point | null = null
  private textEditingAnnotation: any = null

  private readonly tools: Record<string, any>

  private selection: SelectionState = {
    annotation: null,
    handle: null,
    startPoint: null,
    original: null
  }

  // Tool properties
  private toolProperties: Record<string, any> = {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent",
    fontSize: 16,
    fontFamily: "Arial"
  }

  // Event callbacks
  private onAnnotationAdded?: () => void
  private onAnnotationModified?: () => void
  private onPreviewUpdate?: () => void
  private onTextEditingChanged?: (isEditing: boolean) => void

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas unsupported")
    this.ctx = ctx

    this.tools = {
      arrow: new ArrowTool(),
      // rectangle, ellipse, freehand, text...
      rectangle: new RectangleTool(),
      ellipse: new EllipseTool(),
      freehand: new FreehandTool(),
      text: new TextTool()
    }

    this.bindEvents()
  }

  setTool(tool: ToolType) {
    this.activeTool = tool
  }

  getActiveTool() {
    return this.activeTool
  }

  getToolSchema(tool: ToolType) {
    return this.tools[tool].getConfigSchema()
  }

  setToolProperties(properties: Record<string, any>) {
    this.toolProperties = { ...this.toolProperties, ...properties }
  }

  getToolProperties() {
    return { ...this.toolProperties }
  }

  setBackgroundImage(image: HTMLImageElement) {
    this.backgroundImage = image
  }

  setEventCallbacks(callbacks: { 
    onAnnotationAdded?: () => void; 
    onAnnotationModified?: () => void;
    onPreviewUpdate?: () => void;
    onTextEditingChanged?: (isEditing: boolean) => void;
  }) {
    this.onAnnotationAdded = callbacks.onAnnotationAdded
    this.onAnnotationModified = callbacks.onAnnotationModified
    this.onPreviewUpdate = callbacks.onPreviewUpdate
    this.onTextEditingChanged = callbacks.onTextEditingChanged
  }

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onDown)
    this.canvas.addEventListener("pointermove", this.onMove)
    this.canvas.addEventListener("pointerup", this.onUp)
  }

  private getPoint = (e: PointerEvent): Point => {
    const rect = this.canvas.getBoundingClientRect()
    const scaleX = this.canvas.width / rect.width
    const scaleY = this.canvas.height / rect.height

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  private startDrawing(p: Point) {
    this.isDrawing = true
    this.drawingState = this.tools[this.activeTool].onPointerDown(p)
    
    // Create initial preview with current tool properties
    this.updatePreview()
  }

  private updatePreview() {
    if (!this.isDrawing || !this.drawingState) return

    // Get preview annotation from tool
    const previewAnnotation = this.tools[this.activeTool].getPreview?.(this.drawingState)
    if (previewAnnotation) {
      // Apply current tool properties to preview
      this.currentPreview = {
        ...previewAnnotation,
        stroke: this.toolProperties.stroke,
        strokeWidth: this.toolProperties.strokeWidth,
        fill: this.toolProperties.fill,
        fontSize: this.toolProperties.fontSize,
        fontFamily: this.toolProperties.fontFamily,
      }
    }

    this.onPreviewUpdate?.()
    this.redraw()
  }

  private finishDrawing(p: Point): Annotation | null {
    if (!this.isDrawing) return null

    this.isDrawing = false
    const annotation = this.tools[this.activeTool].onPointerUp(p, this.drawingState)
    
    this.currentPreview = null
    this.drawingState = null

    return annotation
  }

  private onDown = (e: PointerEvent) => {
    const p = this.getPoint(e)

    // Handle text editing mode differently
    if (this.activeTool === "text" && this.isTextEditing) {
      return // Don't interfere with text editing
    }

    // Check for selection first
    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const a = this.annotations[i]
      if (this.tools[a.type].hitTest(a as any, p)) {
        const bounds = getBounds(a)
        const handles = getHandles(bounds)
        const handle = hitHandle(p, handles)

        // Handle text selection for editing
        if (a.type === "text") {
          this.startTextEditing(a.position, a)
          return
        }

        this.selection = {
          annotation: a,
          handle: handle || 'move',
          startPoint: p,
          original: structuredClone(a)
        }
        return
      }
    }

    // Clear selection and start drawing
    this.selection = { annotation: null, handle: null, startPoint: null, original: null }

    // Handle text tool click
    if (this.activeTool === "text") {
      this.startTextEditing(p)
      return
    }

    this.startDrawing(p)
  }

  private onMove = (e: PointerEvent) => {
    const p = this.getPoint(e)

    // Handle selection/movement
    if (this.selection.annotation && this.selection.startPoint) {
      const dx = p.x - this.selection.startPoint.x
      const dy = p.y - this.selection.startPoint.y

      const a = this.selection.annotation
      Object.assign(a, structuredClone(this.selection.original))

      if (this.selection.handle === 'move') {
        moveAnnotation(a, dx, dy)
      } else {
        resizeAnnotation(a, this.selection.handle, dx, dy)
      }

      this.redraw()
      return
    }

    // Handle preview during drawing
    if (this.isDrawing) {
      this.tools[this.activeTool].onPointerMove(p, this.drawingState)
      this.updatePreview()
      return
    }

    // Regular tool movement
    this.tools[this.activeTool].onPointerMove(p)
  }

  private onUp = (e: PointerEvent) => {
    const p = this.getPoint(e)

    // Handle selection finish
    if (this.selection.annotation) {
      this.selection = { annotation: null, handle: null, startPoint: null, original: null }
      this.onAnnotationModified?.()
      return
    }

    // Handle drawing finish
    if (this.isDrawing) {
      const annotation = this.finishDrawing(p)
      if (annotation) {
        // Apply current tool properties to new annotation
        const annotationWithProperties = {
          ...annotation,
          stroke: this.toolProperties.stroke,
          strokeWidth: this.toolProperties.strokeWidth,
          fill: this.toolProperties.fill,
          fontSize: this.toolProperties.fontSize,
          fontFamily: this.toolProperties.fontFamily,
        }
        this.annotations.push(annotationWithProperties)
        this.onAnnotationAdded?.()
      }
    } else {
      // Fallback for tools that don't use preview system yet
      const a = this.tools[this.activeTool].onPointerUp(p)
      if (a) {
        const annotationWithProperties = {
          ...a,
          stroke: this.toolProperties.stroke,
          strokeWidth: this.toolProperties.strokeWidth,
          fill: this.toolProperties.fill,
          fontSize: this.toolProperties.fontSize,
          fontFamily: this.toolProperties.fontFamily,
        }
        this.annotations.push(annotationWithProperties)
        this.onAnnotationAdded?.()
      }
    }
    
    this.redraw()
  }

  redraw() {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw background image if available
    if (this.backgroundImage) {
      this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height)
    }

    // Draw completed annotations
    renderAnnotations(this.ctx, this.annotations, this.tools)

    // Draw preview annotation if drawing
    if (this.currentPreview) {
      this.tools[this.currentPreview.type].draw(this.ctx, this.currentPreview)
    }

    // Draw selection handles
    if (this.selection.annotation) {
      const bounds = getBounds(this.selection.annotation)
      const handles = getHandles(bounds)
      drawHandles(this.ctx, handles)
    }
  }

  // Text editing methods
  startTextEditing(position: Point, annotation?: any) {
    const textTool = this.tools.text as TextTool
    
    if (textTool.startTextEditing(position, annotation)) {
      this.isTextEditing = true
      this.textEditingPosition = position
      this.textEditingAnnotation = annotation
      this.onTextEditingChanged?.(true)
    }
  }

  finishTextEditing(text: string) {
    const textTool = this.tools.text as TextTool
    const annotation = textTool.finishTextEditing(text)
    
    if (annotation) {
      if (textTool.getEditingAnnotation()) {
        // Update existing annotation
        const index = this.annotations.findIndex(a => a.id === annotation.id)
        if (index !== -1) {
          // Apply current tool properties
          const annotationWithProperties = {
            ...annotation,
            stroke: this.toolProperties.stroke,
            strokeWidth: this.toolProperties.strokeWidth,
            fill: this.toolProperties.fill,
            fontSize: this.toolProperties.fontSize,
            fontFamily: this.toolProperties.fontFamily,
          }
          this.annotations[index] = annotationWithProperties
          this.onAnnotationModified?.()
        }
      } else {
        // Add new annotation
        const annotationWithProperties = {
          ...annotation,
          stroke: this.toolProperties.stroke,
          strokeWidth: this.toolProperties.strokeWidth,
          fill: this.toolProperties.fill,
          fontSize: this.toolProperties.fontSize,
          fontFamily: this.toolProperties.fontFamily,
        }
        this.annotations.push(annotationWithProperties)
        this.onAnnotationAdded?.()
      }
    }

    this.cancelTextEditing()
  }

  cancelTextEditing() {
    const textTool = this.tools.text as TextTool
    textTool.cancelTextEditing()
    
    this.isTextEditing = false
    this.textEditingPosition = null
    this.textEditingAnnotation = null
    this.onTextEditingChanged?.(false)
    this.redraw()
  }

  updateTextPreview(text: string) {
    const textTool = this.tools.text as TextTool
    textTool.updatePreviewText(text)
    
    // Update preview for real-time feedback
    if (this.isTextEditing && this.textEditingPosition) {
      const previewAnnotation = textTool.getPreview({
        position: this.textEditingPosition,
        text: text
      })
      
      if (previewAnnotation) {
        this.currentPreview = {
          ...previewAnnotation,
          stroke: this.toolProperties.stroke,
          strokeWidth: this.toolProperties.strokeWidth,
          fill: this.toolProperties.fill,
          fontSize: this.toolProperties.fontSize,
          fontFamily: this.toolProperties.fontFamily,
        }
      }
      
      this.redraw()
    }
  }

  exportPNG(): string {
    return this.canvas.toDataURL("image/png")
  }

  serialize() {
    return JSON.stringify(this.annotations)
  }

  load(json: string) {
    this.annotations = JSON.parse(json)
    this.redraw()
  }

  // Public methods for preview state
  getIsDrawing(): boolean {
    return this.isDrawing
  }

  getCurrentPreview(): Annotation | null {
    return this.currentPreview
  }

  // Public methods for text editing state
  getIsTextEditing(): boolean {
    return this.isTextEditing
  }

  getTextEditingPosition(): Point | null {
    return this.textEditingPosition
  }

  getTextEditingAnnotation(): any {
    return this.textEditingAnnotation
  }
}
