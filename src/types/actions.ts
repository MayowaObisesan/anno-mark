// Types for annotation actions and state management

export type AnnotationTool = 
  | 'arrow'
  | 'rectangle'
  | 'ellipse'
  | 'freehand'
  | 'text'
  | 'blur'

export interface BaseAction {
  id: string
  tool: AnnotationTool
  color: string
  strokeWidth: number
  timestamp: number
}

export interface ArrowAction extends BaseAction {
  tool: 'arrow'
  startX: number
  startY: number
  endX: number
  endY: number
}

export interface RectangleAction extends BaseAction {
  tool: 'rectangle'
  x: number
  y: number
  width: number
  height: number
  filled: boolean
}

export interface EllipseAction extends BaseAction {
  tool: 'ellipse'
  centerX: number
  centerY: number
  radiusX: number
  radiusY: number
  filled: boolean
}

export interface FreehandAction extends BaseAction {
  tool: 'freehand'
  points: { x: number; y: number }[]
}

export interface TextAction extends BaseAction {
  tool: 'text'
  x: number
  y: number
  text: string
  fontSize: number
  fontFamily: string
}

export interface BlurAction extends BaseAction {
  tool: 'blur'
  x: number
  y: number
  width: number
  height: number
  intensity: number
}

export type AnnotationAction = 
  | ArrowAction
  | RectangleAction
  | EllipseAction
  | FreehandAction
  | TextAction
  | BlurAction

export interface AnnotationState {
  actions: AnnotationAction[]
  undoStack: AnnotationAction[]
  redoStack: AnnotationAction[]
  currentTool: AnnotationTool
  isDrawing: boolean
  currentAction?: AnnotationAction
}

export interface DrawingState {
  isDrawing: boolean
  startPoint?: { x: number; y: number }
  currentPoint?: { x: number; y: number }
  points?: { x: number; y: number }[]
}
