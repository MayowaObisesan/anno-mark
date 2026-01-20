// Message types for communication between popup, background, and content scripts

export interface GetDocumentMetricsMessage {
  type: 'GET_DOCUMENT_METRICS'
}

export interface DocumentMetricsResponse {
  type: 'DOCUMENT_METRICS_RESPONSE'
  data: {
    scrollHeight: number
    scrollWidth: number
    viewportHeight: number
    viewportWidth: number
    devicePixelRatio: number
    scrollY: number
    shouldUseSnapDomPrimary?: boolean
  }
}

export interface ScrollToPositionMessage {
  type: 'SCROLL_TO_POSITION'
  data: {
    x: number
    y: number
  }
}

export interface ScrollCompleteMessage {
  type: 'SCROLL_COMPLETE'
}

export interface CaptureSliceMessage {
  type: 'CAPTURE_SLICE'
  data: {
    viewport: {
      x: number
      y: number
      width: number
      height: number
    }
  }
}

export interface CaptureSliceResponse {
  type: 'CAPTURE_SLICE_RESPONSE'
  data: {
    dataUrl: string
    offsetY: number
  }
}

export interface CaptureSliceFallbackMessage {
  type: 'CAPTURE_SLICE_FALLBACK'
  data: {
    x: number
    y: number
    width: number
    height: number
  }
}

export interface CaptureSliceFallbackResponse {
  type: 'CAPTURE_SLICE_FALLBACK_RESPONSE'
  data: {
    dataUrl: string
  }
}

export interface StartCaptureMessage {
  type: 'START_CAPTURE'
  data?: {
    useOverlay?: boolean
  }
}

export interface ShowOverlayEditorMessage {
  type: 'SHOW_OVERLAY_EDITOR'
  data: {
    dataUrl: string
    width: number
    height: number
  }
}

export interface HideOverlayEditorMessage {
  type: 'HIDE_OVERLAY_EDITOR'
}

export interface OverlayEditorClosedMessage {
  type: 'OVERLAY_EDITOR_CLOSED'
}

export interface SaveAnnotationMessage {
  type: 'SAVE_ANNOTATION'
  data: {
    dataUrl: string
  }
}

export interface CaptureProgressMessage {
  type: 'CAPTURE_PROGRESS'
  data: {
    progress: number
    status: string
  }
}

export interface CaptureCompleteMessage {
  type: 'CAPTURE_COMPLETE'
  data: {
    dataUrl: string
    width: number
    height: number
  }
}

export interface CaptureErrorMessage {
  type: 'CAPTURE_ERROR'
  data: {
    error: string
    fallbackUsed?: boolean
  }
}

export interface OpenEditorMessage {
  type: 'OPEN_EDITOR'
  data: {
    captureDataUrl: string
    width: number
    height: number
  }
}

export type ExtensionMessage =
  | GetDocumentMetricsMessage
  | DocumentMetricsResponse
  | ScrollToPositionMessage
  | ScrollCompleteMessage
  | CaptureSliceMessage
  | CaptureSliceResponse
  | CaptureSliceFallbackMessage
  | CaptureSliceFallbackResponse
  | StartCaptureMessage
  | CaptureProgressMessage
  | CaptureCompleteMessage
  | CaptureErrorMessage
  | OpenEditorMessage
  | ShowOverlayEditorMessage
  | HideOverlayEditorMessage
  | OverlayEditorClosedMessage
  | SaveAnnotationMessage
