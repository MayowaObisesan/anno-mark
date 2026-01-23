/**
 * ImageKit Types
 * Type definitions for ImageKit integration
 */

export interface ImageKitUploadOptions {
  file: File | Blob
  fileName: string
  folder?: string
  tags?: string[]
  useUniqueFileName?: boolean
  isPrivateFile?: boolean
  customCoordinates?: string
  responseFields?: string[]
}

export interface ImageKitUploadResponse {
  fileId: string
  name: string
  url: string
  size: number
  width: number
  height: number
  thumbnailUrl: string
  mimeType: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  customMetadata?: Record<string, any>
}

export interface ImageKitError {
  message: string
  help?: string
  code?: string
  requestId?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  success: boolean
  data?: ImageKitUploadResponse
  error?: ImageKitError
  fileId?: string
  url?: string
  thumbnailUrl?: string
}

export interface ImageKitMetadata {
  fileId: string
  url: string
  thumbnailUrl?: string
  size: number
  width: number
  height: number
  mimeType: string
  createdAt: string
  tags?: string[]
}

export interface CloudStorageSettings {
  enabled: boolean
  autoSync: boolean
  syncOnWifiOnly: boolean
  maxFileSize: number // in bytes
  allowedFormats: string[]
  compressionQuality: number // 0-100
  generateThumbnails: boolean
  thumbnailSize: {
    width: number
    height: number
  }
}

export interface SyncStatus {
  annotationId: string
  status: 'synced' | 'pending' | 'failed' | 'local-only' | 'uploading'
  lastSyncAt?: Date
  errorMessage?: string
  retryCount: number
}

export interface UploadQueueItem {
  id: string
  annotationId: string
  dataUrl: string
  fileName: string
  folder: string
  metadata: Record<string, any>
  createdAt: Date
  retryCount: number
  maxRetries: number
  status: 'pending' | 'uploading' | 'completed' | 'failed'
  error?: string
}

export interface ThumbnailGenerationOptions {
  width: number
  height: number
  quality: number
  format: 'webp' | 'jpeg' | 'png'
  maintainAspectRatio: boolean
}

export interface ThumbnailResult {
  success: boolean
  thumbnailUrl?: string
  thumbnailSize?: number
  error?: string
}

export interface CloudStorageStats {
  totalImages: number
  totalSize: number
  syncedImages: number
  pendingUploads: number
  failedUploads: number
  lastSyncAt?: Date
}
