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

  private readonly tools: Record<string, any>

  private selection: SelectionState = {
    annotation: null,
    handle: null,
    startPoint: null,
    original: null
  }

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

  /*private onDown = (e: PointerEvent) => {
    this.tools[this.activeTool].onPointerDown(this.getPoint(e))
  }*/

  private onDown = (e: PointerEvent) => {
    const p = this.getPoint(e)

    for (let i = this.annotations.length - 1; i >= 0; i--) {
      const a = this.annotations[i]
      if (this.tools[a.type].hitTest(a as any, p)) {
        const bounds = getBounds(a)
        const handles = getHandles(bounds)
        const handle = hitHandle(p, handles)

        this.selection = {
          annotation: a,
          handle: handle || 'move',
          startPoint: p,
          original: structuredClone(a)
        }
        return
      }
    }

    this.selection = { annotation: null, handle: null, startPoint: null, original: null }
    this.tools[this.activeTool].onPointerDown(p)
  }
/*
  private onMove = (e: PointerEvent) => {
    this.tools[this.activeTool].onPointerMove(this.getPoint(e))
    this.redraw()
  }*/

  private onMove = (e: PointerEvent) => {
    const p = this.getPoint(e)

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

    this.tools[this.activeTool].onPointerMove(p)
    this.redraw()
  }


  /*private onUp = (e: PointerEvent) => {
    const annotation = this.tools[this.activeTool].onPointerUp(this.getPoint(e))
    if (annotation) this.annotations.push(annotation)
    this.redraw()
  }*/

  private onUp = (e: PointerEvent) => {
    if (this.selection.annotation) {
      this.selection = { annotation: null, handle: null, startPoint: null, original: null }
      return
    }

    const a = this.tools[this.activeTool].onPointerUp(this.getPoint(e))
    if (a) this.annotations.push(a)
    this.redraw()
  }

  /*private redraw() {
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height)
    renderAnnotations(this.ctx, this.annotations, this.tools)
  }*/

  redraw() {
    /*this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    this.annotations.forEach(a =>
      this.tools[a.type].draw(this.ctx, a as any)
    )*/

    clearCanvas(this.ctx, this.canvas.width, this.canvas.height)
    renderAnnotations(this.ctx, this.annotations, this.tools)

    if (this.selection.annotation) {
      const bounds = getBounds(this.selection.annotation)
      const handles = getHandles(bounds)
      drawHandles(this.ctx, handles)
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
}
