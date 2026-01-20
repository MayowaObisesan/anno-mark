// Settings schema for the extension

export interface AnnotationSettings {
  color: string
  size: number
  format: 'png' | 'jpeg'
  strokeWidth: number
  fontSize: number
  blurIntensity: number
}

export interface CaptureSettings {
  overlap: number
  delay: number
  maxRetries: number
  useFallback: boolean
}

export interface AppSettings {
  annotation: AnnotationSettings
  capture: CaptureSettings
  showOnboarding: boolean
  keyboardShortcuts: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  annotation: {
    color: '#ff0000',
    size: 2,
    format: 'png',
    strokeWidth: 2,
    fontSize: 16,
    blurIntensity: 10
  },
  capture: {
    overlap: 30,
    delay: 120,
    maxRetries: 3,
    useFallback: true
  },
  showOnboarding: true,
  keyboardShortcuts: true
}

export type SettingsKey = keyof AppSettings | keyof AnnotationSettings | keyof CaptureSettings
