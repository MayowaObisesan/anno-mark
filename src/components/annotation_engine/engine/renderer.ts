import type { Annotation } from "./types"

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)
}

export function renderAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: Annotation[],
  toolMap: Record<string, any>
) {
  for (const annotation of annotations) {
    toolMap[annotation.type].draw(ctx, annotation)
  }
}
