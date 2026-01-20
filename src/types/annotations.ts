// Types for annotation actions
export interface AnnotationAction {
  id: string
  tool: 'arrow' | 'rectangle' | 'ellipse' | 'freehand' | 'text' | 'blur'
  color: string
  size: number
  startX: number
  startY: number
  endX?: number
  endY?: number
  text?: string
  points?: { x: number; y: number }[]
}

export interface AnnotationEditorProps {
  imageData: string
  width: number
  height: number
  onExport?: (dataUrl: string) => void
  onClose?: () => void
  exportButtonText?: string
  showCloseButton?: boolean
  className?: string
}
