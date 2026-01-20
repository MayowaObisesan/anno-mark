// Types related to page capture functionality

export interface DocumentMetrics {
  scrollHeight: number
  scrollWidth: number
  viewportHeight: number
  viewportWidth: number
  devicePixelRatio: number
  scrollY: number
  shouldUseSnapDomPrimary?: boolean
}

export interface CapturePlan {
  totalHeight: number
  totalWidth: number
  steps: CaptureStep[]
  overlap: number
}

export interface CaptureStep {
  x: number
  y: number
  offsetY: number
  viewportWidth: number
  viewportHeight: number
}

export interface CapturePiece {
  dataUrl: string
  offsetY: number
  width: number
  height: number
}

export interface CaptureResult {
  dataUrl: string
  width: number
  height: number
  pieceCount: number
  fallbackUsed: boolean
  duration: number
  captureMethod?: 'snapdom' | 'chrome-api'
}

export interface CaptureOptions {
  format?: 'png' | 'jpeg'
  quality?: number
  overlap?: number
  delay?: number
  useFallback?: boolean
}
