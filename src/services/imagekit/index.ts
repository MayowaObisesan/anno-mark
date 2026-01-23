/**
 * ImageKit Service
 * Main entry point for ImageKit integration
 */

export { imagekitConfigService, DEFAULT_CREDENTIALS } from './config'
export { imagekitUploadService } from './upload'
export type {
  ImageKitUploadOptions,
  ImageKitUploadResponse,
  ImageKitError,
  UploadProgress,
  UploadResult,
  ImageKitMetadata,
  CloudStorageSettings,
  SyncStatus,
  UploadQueueItem,
  ThumbnailGenerationOptions,
  ThumbnailResult,
  CloudStorageStats
} from './types'
export type { ImageKitConfig, ImageKitCredentials } from './config'

// Re-export commonly used utilities
import { imagekitConfigService } from './config'
import { imagekitUploadService } from './upload'
import type { CloudStorageSettings } from './types'

/**
 * Initialize ImageKit with default or provided credentials
 */
export async function initializeImageKit(credentials?: {
  urlEndpoint?: string
  publicKey?: string
  privateKey?: string
}): Promise<void> {
  const config = {
    urlEndpoint: credentials?.urlEndpoint || process.env.PLASMO_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
    publicKey: credentials?.publicKey || process.env.PLASMO_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
    privateKey: credentials?.privateKey || process.env.IMAGEKIT_PRIVATE_KEY || ''
  }

  await imagekitConfigService.initialize(config)
}

/**
 * Get ImageKit configuration status
 */
export function getImageKitStatus(): {
  isInitialized: boolean
  hasCredentials: boolean
  config?: any
} {
  const isInitialized = imagekitConfigService.isInitialized()
  const config = imagekitConfigService.getConfig()
  
  return {
    isInitialized,
    hasCredentials: !!(config?.urlEndpoint && config?.publicKey),
    config
  }
}

/**
 * Validate ImageKit credentials
 */
export function validateCredentials(credentials: {
  urlEndpoint?: string
  publicKey?: string
}): { isValid: boolean; errors: string[] } {
  return imagekitConfigService.validateConfig({
    urlEndpoint: credentials.urlEndpoint || '',
    publicKey: credentials.publicKey || ''
  })
}

/**
 * Default cloud storage settings
 */
export const DEFAULT_CLOUD_STORAGE_SETTINGS: CloudStorageSettings = {
  enabled: true,
  autoSync: true,
  syncOnWifiOnly: false,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['png', 'jpeg', 'jpg', 'webp'],
  compressionQuality: 85,
  generateThumbnails: true,
  thumbnailSize: {
    width: 200,
    height: 150
  }
}

/**
 * Convenience function to upload annotation with default settings
 */
export async function uploadAnnotation(
  dataUrl: string,
  fileName?: string,
  options?: {
    folder?: string
    tags?: string[]
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  }
) {
  const finalFileName = fileName || imagekitConfigService.generateFilename('png')
  const folder = options?.folder || imagekitConfigService.generateFolderPath()

  return imagekitUploadService.uploadFromDataUrl(
    dataUrl,
    finalFileName,
    folder,
    options?.onProgress
  )
}

/**
 * Get transformed ImageKit URL
 */
export function getTransformedUrl(
  url: string,
  options: {
    width?: number
    height?: number
    quality?: number
    format?: string
  } = {}
): string {
  return imagekitConfigService.getTransformedUrl(url, options)
}

/**
 * Check if browser supports required features
 */
export function checkBrowserSupport(): {
  supported: boolean
  features: {
    canvas: boolean
    fileApi: boolean
    webp: boolean
    blob: boolean
  }
  recommendations: string[]
} {
  const features = {
    canvas: !!document.createElement('canvas').getContext,
    fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
    webp: !!document.createElement('canvas').toDataURL('image/webp').startsWith('data:image/webp'),
    blob: !!window.Blob
  }

  const recommendations: string[] = []

  if (!features.canvas) {
    recommendations.push('Canvas API is required for image processing')
  }
  if (!features.fileApi) {
    recommendations.push('File API is required for file uploads')
  }
  if (!features.webp) {
    recommendations.push('WebP support is recommended for better compression')
  }
  if (!features.blob) {
    recommendations.push('Blob API is required for image processing')
  }

  return {
    supported: Object.values(features).every(Boolean),
    features,
    recommendations
  }
}
