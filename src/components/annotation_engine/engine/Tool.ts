import type { Annotation, Point } from "./types"

export type ToolConfigSchemaType = "color" | "number" | "text" | "select"

export type ToolConfigSchema = {
  key: string
  label: string
  type: ToolConfigSchemaType
  options?: string[]
  min?: number
  max?: number
}

export interface Tool {
  type: string

  onPointerDown(point: Point): void
  onPointerMove(point: Point): void
  onPointerUp(point: Point): Annotation | null

  draw(ctx: CanvasRenderingContext2D, annotation: Annotation): void

  hitTest(annotation: Annotation, point: Point): boolean

  getConfigSchema(): ToolConfigSchema[]
}
