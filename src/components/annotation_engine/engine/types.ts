export type Point = {
  x: number
  y: number
}

export type ToolType = "arrow" | "rectangle" | "ellipse" | "freehand" | "text"

export type AnnotationBase = {
  id: string
  type: ToolType
  stroke?: string
  strokeWidth?: number
  selected?: boolean
  fill?: string
  fontSize?: number
  fontFamily?: string
}

export type ArrowAnnotation = AnnotationBase & {
  type: "arrow"
  start: Point
  end: Point
}

export type RectAnnotation = AnnotationBase & {
  type: "rectangle"
  start: Point
  end: Point
  fill?: string
}

export type EllipseAnnotation = AnnotationBase & {
  type: "ellipse"
  start: Point
  end: Point
  fill?: string
}

export type FreehandAnnotation = AnnotationBase & {
  type: "freehand"
  points: Point[]
}

export type TextAnnotation = AnnotationBase & {
  type: "text"
  position: Point
  text: string
  fontSize: number
  fontFamily: string
}

export type Annotation =
  | ArrowAnnotation
  | RectAnnotation
  | EllipseAnnotation
  | FreehandAnnotation
  | TextAnnotation
