;
/**
 * Dual Storage Service
 * Handles both V1 and V2 annotations with dual storage (local + cloud)
 */

import type {
  AnnotationQueryOptions,
  AnnotationSearchQuery,
  BatchOperationResult,
  CloudStorageStats,
  CreateAnnotationOptions,
  MigrationStatus,
  StoredAnnotationV2,
  SyncStatus,
  UpdateAnnotationOptions
} from "../types/annotations-v2"
import { dexieStorageService } from './dexie-storage';
import { uploadAnnotation } from './imagekit';
import type { QueryOptions, SearchQuery } from './indexeddb-storage';
import { ThumbnailGenerator } from './thumbnail/generator';


export class DualStorageService {
  private static instance: DualStorageService
  private isInitialized = false

  static getInstance(): DualStorageService {
    if (!DualStorageService.instance) {
      DualStorageService.instance = new DualStorageService()
    }
    return DualStorageService.instance
  }

  /**
   * Initialize the dual storage service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Initialize the underlying Dexie service
      await dexieStorageService.initialize()

      // Initialize ImageKit if credentials are available
      try {
        const { initializeImageKit } = await import('./imagekit')
        await initializeImageKit()
      } catch (error) {
        console.warn('ImageKit initialization failed, using local-only mode:', error)
      }

      this.isInitialized = true
      console.log('Dual storage service initialized successfully')
    } catch (error) {
      console.error('Failed to initialize dual storage service:', error)
      throw error
    }
  }

  /**
   * Save an annotation with dual storage support
   */
  async saveAnnotation(
    annotation: Omit<StoredAnnotationV2, 'id' | 'createdAt' | 'updatedAt'>,
    options: CreateAnnotationOptions = {}
  ): Promise<string> {
    await this.ensureInitialized()

    const now = new Date()
    const id = `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Generate thumbnail if requested
    let thumbnailUrl: string | undefined
    let thumbnailSize: number | undefined

    if (options.generateThumbnail !== false && annotation.dataUrl) {
      const generator = new ThumbnailGenerator()
      const thumbnailResult = await generator.generateThumbnail(annotation.dataUrl, {
        width: 200,
        height: 150,
        quality: 0.7,
        format: ThumbnailGenerator.isWebPSupported() ? 'webp' : 'jpeg'
      })

      if (thumbnailResult.success) {
        thumbnailUrl = thumbnailResult.thumbnailUrl
        thumbnailSize = thumbnailResult.thumbnailSize
      }
    }

    // Prepare annotation with dual storage fields
    const fullAnnotation: StoredAnnotationV2 = {
      ...annotation,
      id,
      thumbnailUrl,
      thumbnailSize,
      createdAt: now,
      updatedAt: now,
      syncStatus: options.syncStatus || 'local-only',
      metadata: {
        ...annotation.metadata,
        version: '1.0.0',
        device: navigator.userAgent,
        browser: this.getBrowserInfo()
      }
    }

    try {
      // Save to local storage first
      await this.saveToLocalStorage(fullAnnotation)

      // Upload to cloud if enabled and requested
      if (options.uploadToCloud !== false && annotation.dataUrl) {
        await this.uploadToCloud(id, annotation.dataUrl, fullAnnotation)
      }

      console.log('Annotation saved successfully with dual storage:', id)
      return id
    } catch (error) {
      console.error('Failed to save annotation:', error)
      throw new Error(`Failed to save annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get an annotation by ID (V2 format preferred)
   */
  async getAnnotation(id: string): Promise<StoredAnnotationV2 | null> {
    await this.ensureInitialized()

    try {
      // Try V2 first
      const v2Annotation = await this.getFromLocalStorage(id)
      if (v2Annotation) {
        return v2Annotation
      }

      // Fallback to V1 and migrate
      const v1Annotation = await dexieStorageService.getAnnotation(id)
      if (v1Annotation) {
        return await this.migrateV1ToV2(v1Annotation)
      }

      return null
    } catch (error) {
      console.error('Failed to get annotation:', error)
      throw new Error(`Failed to get annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get all annotations with enhanced filtering
   */
  async getAllAnnotations(options: AnnotationQueryOptions = {}): Promise<StoredAnnotationV2[]> {
    await this.ensureInitialized()

    try {
      // For now, we'll use the existing V1 methods and migrate results
      // In a full implementation, we'd query the V2 table directly
      const v1Annotations = await dexieStorageService.getAllAnnotations({
        limit: options.limit,
        offset: options.offset,
        sortBy: options.sortBy as any,
        sortOrder: options.sortOrder,
        tags: options.tags,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      })

      // Migrate to V2 format
      const v2Annotations = await Promise.all(
        v1Annotations.map(annotation => this.migrateV1ToV2(annotation))
      )

      // Apply additional V2-specific filters
      let filteredAnnotations = v2Annotations

      if (options.syncStatus) {
        filteredAnnotations = filteredAnnotations.filter(annotation =>
          options.syncStatus!.includes(annotation.syncStatus || 'local-only')
        )
      }

      if (options.hasCloudUrl !== undefined) {
        filteredAnnotations = filteredAnnotations.filter(annotation =>
          !!annotation.imagekitUrl === options.hasCloudUrl
        )
      }

      if (options.hasThumbnail !== undefined) {
        filteredAnnotations = filteredAnnotations.filter(annotation =>
          !!annotation.thumbnailUrl === options.hasThumbnail
        )
      }

      return filteredAnnotations
    } catch (error) {
      console.error('Failed to get annotations:', error)
      throw new Error(`Failed to get annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Update an annotation with dual storage support
   */
  async updateAnnotation(
    id: string,
    updates: Partial<StoredAnnotationV2>,
    options: UpdateAnnotationOptions = {}
  ): Promise<void> {
    await this.ensureInitialized()

    try {
      const existing = await this.getAnnotation(id)
      if (!existing) {
        throw new Error(`Annotation with id ${id} not found`)
      }

      const updated: StoredAnnotationV2 = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date()
      }

      // Regenerate thumbnail if requested
      if (options.regenerateThumbnail && updated.dataUrl) {
        const generator = new ThumbnailGenerator()
        const thumbnailResult = await generator.generateThumbnail(updated.dataUrl)
        if (thumbnailResult.success) {
          updated.thumbnailUrl = thumbnailResult.thumbnailUrl
          updated.thumbnailSize = thumbnailResult.thumbnailSize
        }
      }

      // Save to local storage
      await this.saveToLocalStorage(updated)

      // Sync to cloud if requested
      if (options.syncToCloud && updated.dataUrl) {
        await this.uploadToCloud(id, updated.dataUrl, updated)
      }

      console.log('Annotation updated successfully with dual storage:', id)
    } catch (error) {
      console.error('Failed to update annotation:', error)
      throw new Error(`Failed to update annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete an annotation with cloud cleanup
   */
  async deleteAnnotation(id: string): Promise<void> {
    await this.ensureInitialized()

    try {
      const annotation = await this.getAnnotation(id)

      // Delete from cloud first if it exists
      if (annotation?.imagekitFileId) {
        try {
          const { imagekitUploadService } = await import('./imagekit')
          await imagekitUploadService.deleteFile(annotation.imagekitFileId)
        } catch (error) {
          console.warn('Failed to delete from cloud:', error)
          // Continue with local deletion even if cloud deletion fails
        }
      }

      // Delete from local storage
      await this.deleteFromLocalStorage(id)

      console.log('Annotation deleted successfully with dual storage:', id)
    } catch (error) {
      console.error('Failed to delete annotation:', error)
      throw new Error(`Failed to delete annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Search annotations with enhanced V2 capabilities
   */
  async searchAnnotations(query: AnnotationSearchQuery): Promise<StoredAnnotationV2[]> {
    await this.ensureInitialized()

    try {
      // Convert V2 query to V1 format for now
      const v1Query: SearchQuery = {
        text: query.text,
        tags: query.tags,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        minSize: query.minSize,
        maxSize: query.maxSize
      }

      const v1Results = await dexieStorageService.searchAnnotations(v1Query)

      // Migrate results to V2 and apply additional filters
      const v2Results = await Promise.all(
        v1Results.map(annotation => this.migrateV1ToV2(annotation))
      )

      return v2Results.filter(annotation => {
        if (query.syncStatus && !query.syncStatus.includes(annotation.syncStatus || 'local-only')) {
          return false
        }
        if (query.hasCloudUrl !== undefined && !!annotation.imagekitUrl !== query.hasCloudUrl) {
          return false
        }
        if (query.hasThumbnail !== undefined && !!annotation.thumbnailUrl !== query.hasThumbnail) {
          return false
        }
        return true
      })
    } catch (error) {
      console.error('Failed to search annotations:', error)
      throw new Error(`Failed to search annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get cloud storage statistics
   */
  async getCloudStorageStats(): Promise<CloudStorageStats> {
    await this.ensureInitialized()

    try {
      const allAnnotations = await this.getAllAnnotations()

      const stats: CloudStorageStats = {
        totalAnnotations: allAnnotations.length,
        syncedAnnotations: allAnnotations.filter(a => a.syncStatus === 'synced').length,
        localOnlyAnnotations: allAnnotations.filter(a => a.syncStatus === 'local-only').length,
        failedSyncs: allAnnotations.filter(a => a.syncStatus === 'failed').length,
        pendingUploads: allAnnotations.filter(a => ['pending', 'uploading'].includes(a.syncStatus || 'local-only')).length,
        totalCloudSize: allAnnotations.reduce((sum, a) => sum + (a.fileSize || 0), 0),
        totalLocalSize: allAnnotations.reduce((sum, a) => sum + (a.thumbnailSize || 0), 0),
        syncInProgress: false
      }

      return stats
    } catch (error) {
      console.error('Failed to get cloud storage stats:', error)
      throw new Error(`Failed to get cloud storage stats: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Migrate existing annotations to V2 format
   */
  async migrateToV2(): Promise<MigrationStatus> {
    await this.ensureInitialized()

    const status: MigrationStatus = {
      totalAnnotations: 0,
      migratedAnnotations: 0,
      failedMigrations: 0,
      currentPhase: 'scanning',
      progress: 0,
      startedAt: new Date()
    }

    try {
      // Get all V1 annotations
      status.currentPhase = 'scanning'
      const v1Annotations = await dexieStorageService.getAllAnnotations()
      status.totalAnnotations = v1Annotations.length
      status.progress = 10

      if (v1Annotations.length === 0) {
        status.currentPhase = 'completed'
        status.progress = 100
        return status
      }

      // Phase 2: Generate thumbnails
      status.currentPhase = 'thumbnail-generation'
      status.progress = 20

      for (let i = 0; i < v1Annotations.length; i++) {
        const annotation = v1Annotations[i]

        try {
          const v2Annotation = await this.migrateV1ToV2(annotation)

          // Generate thumbnail if needed
          if (!v2Annotation.thumbnailUrl && v2Annotation.dataUrl) {
            const generator = new ThumbnailGenerator()
            const thumbnailResult = await generator.generateThumbnail(v2Annotation.dataUrl)
            if (thumbnailResult.success) {
              v2Annotation.thumbnailUrl = thumbnailResult.thumbnailUrl
              v2Annotation.thumbnailSize = thumbnailResult.thumbnailSize
            }
          }

          await this.saveToLocalStorage(v2Annotation)
          status.migratedAnnotations++
        } catch (error) {
          console.error(`Failed to migrate annotation ${annotation.id}:`, error)
          status.failedMigrations++
        }

        status.progress = 20 + (i / v1Annotations.length) * 40
      }

      // Phase 3: Upload to cloud (optional)
      status.currentPhase = 'cloud-upload'
      status.progress = 60

      // This would be implemented based on user preferences
      // For now, we'll mark as completed

      status.currentPhase = 'completed'
      status.progress = 100

      return status
    } catch (error) {
      status.currentPhase = 'failed'
      status.error = error instanceof Error ? error.message : String(error)
      throw error
    }
  }

  /**
   * Sync pending annotations to cloud
   */
  async syncToCloud(): Promise<BatchOperationResult> {
    await this.ensureInitialized()

    const result: BatchOperationResult = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      duration: 0
    }

    const startTime = Date.now()

    try {
      const pendingAnnotations = await this.getAllAnnotations({
        syncStatus: ['pending', 'failed']
      })

      result.total = pendingAnnotations.length

      for (const annotation of pendingAnnotations) {
        if (annotation.dataUrl) {
          try {
            await this.uploadToCloud(annotation.id, annotation.dataUrl, annotation)
            result.successful++
          } catch (error) {
            result.failed++
            result.errors.push({
              id: annotation.id,
              error: error instanceof Error ? error.message : String(error)
            })
          }
        }
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      throw error
    }
  }

  // Private helper methods

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private async saveToLocalStorage(annotation: StoredAnnotationV2): Promise<void> {
    // For now, we'll use the existing V1 storage
    // In a full implementation, we'd have a separate V2 table
    await dexieStorageService.updateAnnotation(annotation.id, annotation)
  }

  private async getFromLocalStorage(id: string): Promise<StoredAnnotationV2 | null> {
    // For now, migrate from V1
    const v1Annotation = await dexieStorageService.getAnnotation(id)
    return v1Annotation ? await this.migrateV1ToV2(v1Annotation) : null
  }

  private async deleteFromLocalStorage(id: string): Promise<void> {
    await dexieStorageService.deleteAnnotation(id)
  }

  private async migrateV1ToV2(v1Annotation: any): Promise<StoredAnnotationV2> {
    return {
      ...v1Annotation,
      thumbnailUrl: undefined,
      imagekitUrl: undefined,
      imagekitFileId: undefined,
      imagekitThumbnailUrl: undefined,
      thumbnailSize: undefined,
      syncStatus: 'local-only' as SyncStatus,
      metadata: {
        version: '1.0.0',
        migratedFrom: 'v1'
      }
    }
  }

  private async uploadToCloud(id: string, dataUrl: string, annotation: StoredAnnotationV2): Promise<void> {
    try {
      // Update sync status to uploading
      await this.updateAnnotationSyncStatus(id, 'uploading')

      // Upload to ImageKit
      const uploadResult = await uploadAnnotation(dataUrl, `annotation-${id}.png`)

      if (uploadResult.success && uploadResult.url && uploadResult.fileId) {
        // Update annotation with cloud info
        await this.updateAnnotation(id, {
          imagekitUrl: uploadResult.url,
          imagekitFileId: uploadResult.fileId,
          imagekitThumbnailUrl: uploadResult.thumbnailUrl,
          syncStatus: 'synced'
        })
      } else {
        throw new Error(uploadResult.error?.message || 'Upload failed')
      }
    } catch (error) {
      // Update sync status to failed
      await this.updateAnnotationSyncStatus(id, 'failed')
      throw error
    }
  }

  private async updateAnnotationSyncStatus(id: string, status: SyncStatus): Promise<void> {
    const annotation = await this.getAnnotation(id)
    if (annotation) {
      await this.saveToLocalStorage({
        ...annotation,
        syncStatus: status,
        updatedAt: new Date()
      })
    }
  }

  private getBrowserInfo(): string {
    const ua = navigator.userAgent
    if (ua.includes('Chrome')) return 'Chrome'
    if (ua.includes('Firefox')) return 'Firefox'
    if (ua.includes('Safari')) return 'Safari'
    if (ua.includes('Edge')) return 'Edge'
    return 'Unknown'
  }
}

// Export singleton instance
export const dualStorageService = DualStorageService.getInstance()
