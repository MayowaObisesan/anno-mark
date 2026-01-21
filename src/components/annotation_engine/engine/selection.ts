import type { Annotation, Point } from "./types"

export type Handle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w"
  | "move"
  | null

export type SelectionState = {
  annotation: Annotation | null
  handle: Handle
  startPoint: Point | null
  original: Annotation | null
}
