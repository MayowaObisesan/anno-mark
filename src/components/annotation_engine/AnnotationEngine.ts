import { clearCanvas, renderAnnotations } from "./engine/renderer";
import type { Annotation, Point, ToolType } from "./engine/types";
import { ArrowTool } from "./tools/ArrowTool";
import { RectangleTool } from "~components/annotation_engine/tools/RectangleTool"
import { EllipseTool } from "~components/annotation_engine/tools/Ellipsis"
import { FreehandTool } from "~components/annotation_engine/tools/FreehandTool"
import { TextTool } from "~components/annotation_engine/tools/TextTool"

export class AnnotationEngine {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private annotations: Annotation[] = []
  private activeTool: ToolType = "arrow"

  private tools: Record<string, any>

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

  private bindEvents() {
    this.canvas.addEventListener("pointerdown", this.onDown)
    this.canvas.addEventListener("pointermove", this.onMove)
    this.canvas.addEventListener("pointerup", this.onUp)
  }

  private getPoint = (e: PointerEvent): Point => {
    const rect = this.canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  private onDown = (e: PointerEvent) => {
    this.tools[this.activeTool].onPointerDown(this.getPoint(e))
  }

  private onMove = (e: PointerEvent) => {
    this.tools[this.activeTool].onPointerMove(this.getPoint(e))
    this.redraw()
  }

  private onUp = (e: PointerEvent) => {
    const annotation = this.tools[this.activeTool].onPointerUp(this.getPoint(e))
    if (annotation) this.annotations.push(annotation)
    this.redraw()
  }

  private redraw() {
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height)
    renderAnnotations(this.ctx, this.annotations, this.tools)
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
}
