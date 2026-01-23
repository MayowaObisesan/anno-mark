/**
 * Enhanced Annotation Types (v2)
 * Supports dual storage with local thumbnails and cloud storage
 */

// Re-export existing types for backward compatibility
export type { AnnotationAction, AnnotationEditorProps } from './annotations'

// Enhanced StoredAnnotation with dual storage support
export interface StoredAnnotationV2 {
  id: string
  dataUrl?: string              // Fallback/backup (base64) - optional in v2
  thumbnailUrl?: string          // Local thumbnail URL (required for mobile-first)
  imagekitUrl?: string           // Cloud full image URL
  imagekitFileId?: string        // ImageKit file ID
  imagekitThumbnailUrl?: string  // Cloud thumbnail URL (optional backup)
  width: number
  height: number
  timestamp: number
  url: string                   // Source page URL
  title: string                  // Page title
  tags: string[]                // User-defined tags
  description?: string           // User notes
  createdAt: Date
  updatedAt: Date
  fileSize: number              // Original image file size in bytes
  thumbnailSize?: number       // Thumbnail file size in bytes
  mimeType: string              // Usually "image/png"
  syncStatus?: SyncStatus       // Cloud sync status
  metadata?: AnnotationMetadata // Additional metadata
}

// Sync status for cloud storage
export type SyncStatus = 
  | 'synced'          // Fully synced with cloud
  | 'pending'         // Pending upload
  | 'uploading'       // Currently uploading
  | 'failed'          // Upload failed, will retry
  | 'local-only'      // Local only, cloud disabled
  | 'partial-sync'    // Only some data synced

// Additional metadata for annotations
export interface AnnotationMetadata {
  device?: string               // Device used for annotation
  browser?: string              // Browser info
  version?: string              // Extension version
  annotationCount?: number      // Number of annotation actions
  toolsUsed?: string[]          // Tools used in annotation
  captureMethod?: string         // How the screenshot was captured
  processingTime?: number       // Time taken to process
  location?: {
    pageX?: number
    pageY?: number
    scrollX?: number
    scrollY?: number
  }
}

// Annotation creation options
export interface CreateAnnotationOptions {
  generateThumbnail?: boolean    // Whether to generate thumbnail (default: true)
  uploadToCloud?: boolean       // Whether to upload to cloud (default: from settings)
  syncStatus?: SyncStatus       // Initial sync status
  metadata?: AnnotationMetadata // Additional metadata
}

// Annotation update options
export interface UpdateAnnotationOptions {
  regenerateThumbnail?: boolean  // Whether to regenerate thumbnail
  syncToCloud?: boolean       // Whether to sync changes to cloud
  updateMetadata?: boolean     // Whether to update metadata
}

// Annotation query options with cloud filtering
export interface AnnotationQueryOptions {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'timestamp' | 'title' | 'syncStatus'
  sortOrder?: 'asc' | 'desc'
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
  syncStatus?: SyncStatus[]     // Filter by sync status
  hasCloudUrl?: boolean         // Filter by cloud availability
  hasThumbnail?: boolean        // Filter by thumbnail availability
}

// Annotation search query with enhanced options
export interface AnnotationSearchQuery {
  text?: string                 // Search in title, description, tags
  tags?: string[]              // Filter by tags
  dateFrom?: Date
  dateTo?: Date
  minSize?: number
  maxSize?: number
  syncStatus?: SyncStatus[]
  hasCloudUrl?: boolean
  hasThumbnail?: boolean
  metadata?: Partial<AnnotationMetadata>
}

// Cloud storage statistics
export interface CloudStorageStats {
  totalAnnotations: number
  syncedAnnotations: number
  localOnlyAnnotations: number
  failedSyncs: number
  pendingUploads: number
  totalCloudSize: number
  totalLocalSize: number
  lastSyncAt?: Date
  syncInProgress: boolean
}

// Annotation export data with cloud info
export interface AnnotationExportData {
  annotations: StoredAnnotationV2[]
  cloudStats: CloudStorageStats
  exportedAt: Date
  version: string
  includeCloudUrls: boolean
  includeThumbnails: boolean
}

// Migration status for v1 to v2 upgrade
export interface MigrationStatus {
  totalAnnotations: number
  migratedAnnotations: number
  failedMigrations: number
  currentPhase: 'scanning' | 'thumbnail-generation' | 'cloud-upload' | 'completed' | 'failed'
  progress: number // 0-100
  error?: string
  startedAt: Date
  estimatedCompletion?: Date
}

// Thumbnail generation progress
export interface ThumbnailGenerationProgress {
  annotationId: string
  status: 'generating' | 'completed' | 'failed'
  progress: number // 0-100
  thumbnailSize?: number
  error?: string
}

// Batch operation results
export interface BatchOperationResult {
  total: number
  successful: number
  failed: number
  errors: Array<{ id: string; error: string }>
  duration: number // in milliseconds
}

// Sync queue item
export interface SyncQueueItem {
  id: string
  annotationId: string
  operation: 'upload' | 'delete' | 'update'
  priority: 'low' | 'normal' | 'high'
  createdAt: Date
  retryCount: number
  maxRetries: number
  nextRetryAt?: Date
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error?: string
}

// Helper types for backward compatibility
export type StoredAnnotation = StoredAnnotationV2

// Type guards
export function isV2Annotation(annotation: any): annotation is StoredAnnotationV2 {
  return annotation && typeof annotation === 'object' && 'id' in annotation && 'syncStatus' in annotation
}

export function hasCloudUrl(annotation: StoredAnnotationV2): boolean {
  return !!annotation.imagekitUrl && !!annotation.imagekitFileId
}

export function hasThumbnail(annotation: StoredAnnotationV2): boolean {
  return !!annotation.thumbnailUrl
}

export function isFullySynced(annotation: StoredAnnotationV2): boolean {
  return annotation.syncStatus === 'synced' && hasCloudUrl(annotation)
}

export function needsSync(annotation: StoredAnnotationV2): boolean {
  return ['pending', 'failed', 'uploading'].includes(annotation.syncStatus || 'local-only')
}

// Utility functions for annotation status
export function getAnnotationStatusDescription(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'Synced with cloud storage'
    case 'pending':
      return 'Waiting to sync'
    case 'uploading':
      return 'Uploading to cloud...'
    case 'failed':
      return 'Sync failed, will retry'
    case 'local-only':
      return 'Local only (cloud disabled)'
    case 'partial-sync':
      return 'Partially synced'
    default:
      return 'Unknown status'
  }
}

export function getSyncPriority(status: SyncStatus): number {
  switch (status) {
    case 'failed':
      return 1 // Highest priority
    case 'pending':
      return 2
    case 'uploading':
      return 3
    case 'partial-sync':
      return 4
    case 'synced':
      return 5
    case 'local-only':
      return 6 // Lowest priority
    default:
      return 999
  }
}
