/**
 * Dexie Storage Service for Anno-Mark
 * Provides clean, efficient IndexedDB operations using Dexie.js
 */

import { Dexie, type Table } from "dexie"

import type { QueryOptions, SearchQuery, StorageInfo, StoredAnnotation, Tag } from './indexeddb-storage';
import type { StoredAnnotationV2, SyncStatus } from "~types/annotations-v2";

// Extended interfaces for Dexie relationships
export interface AnnotationTag {
  id?: number
  annotationId: string
  tagId: string
  createdAt: Date
}

// V2 Annotation interface with dual storage support
export interface DexieAnnotationV2 extends StoredAnnotationV2 {
  // Dexie-specific fields are inherited from StoredAnnotationV2
}

// Database setup with proper typing
const db = new Dexie('AnnoMarkDB') as Dexie & {
  annotations: Table<StoredAnnotation, string>
  annotationsV2: Table<DexieAnnotationV2, string>
  tags: Table<Tag, string>
  annotationTags: Table<AnnotationTag, number>
}

// Database versioning with migration support
db.version(1).stores({
  annotations: '&id, dataUrl, width, height, timestamp, url, title, createdAt, updatedAt, fileSize, mimeType, *tags',
  tags: '&id, name, color, count, createdAt',
  annotationTags: '++id, annotationId, tagId, [annotationId+tagId]'
})

// Add migration for future versions
db.version(2).stores({
  annotations: '&id, dataUrl, width, height, timestamp, url, title, createdAt, updatedAt, fileSize, mimeType, *tags',
  tags: '&id, name, color, count, createdAt',
  annotationTags: '++id, annotationId, tagId, [annotationId+tagId]'
}).upgrade(tx => {
  // Migration logic from version 1 to 2 can be added here
  console.log('Migrating database from version 1 to 2')
})

// V2 with dual storage support
db.version(3).stores({
  annotationsV2: '&id, dataUrl, thumbnailUrl, imagekitUrl, imagekitFileId, imagekitThumbnailUrl, width, height, timestamp, url, title, createdAt, updatedAt, fileSize, thumbnailSize, mimeType, syncStatus, *tags',
  tags: '&id, name, color, count, createdAt',
  annotationTags: '++id, annotationId, tagId, [annotationId+tagId]'
}).upgrade(tx => {
  // Migration from v1/v2 to v3 with dual storage
  console.log('Migrating database to v3 with dual storage support')

  // Migrate existing annotations to v2 format
  return tx.table('annotations').toCollection().each(oldAnnotation => {
    const v2Annotation: DexieAnnotationV2 = {
      ...oldAnnotation,
      thumbnailUrl: undefined, // Will be generated later
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

    // Add to annotationsV2 table
    return tx.table('annotationsV2').add(v2Annotation)
  }).then(() => {
    console.log('Successfully migrated annotations to v2 format')
  }).catch(error => {
    console.error('Failed to migrate annotations:', error)
  })
})

class DexieStorageService {
  private isInitialized = false

  /**
   * Initialize the Dexie database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      await db.open()
      this.isInitialized = true
      console.log('Dexie database initialized successfully')
    } catch (error) {
      console.error('Failed to initialize Dexie database:', error)
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  /**
   * Get storage information including quota and usage
   */
  async getStorageInfo(): Promise<StorageInfo> {
    await this.ensureInitialized()

    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate()
      const annotationCount = await this.getAnnotationCount()

      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        available: (estimate.quota || 0) - (estimate.usage || 0),
        annotationCount
      }
    }

    // Fallback if storage API is not available
    const annotationCount = await this.getAnnotationCount()
    return {
      quota: 0,
      usage: 0,
      available: 0,
      annotationCount
    }
  }

  /**
   * Save an annotation to the database
   */
  async saveAnnotation(annotation: Omit<StoredAnnotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.ensureInitialized()

    const now = new Date()
    const id = `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const fullAnnotation: StoredAnnotation = {
      ...annotation,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Calculate file size
    const base64Data = annotation.dataUrl.split(',')[1] || ''
    fullAnnotation.fileSize = Math.round(base64Data.length * 0.75) // Approximate size

    try {
      await db.transaction('rw', db.annotations, db.tags, async () => {
        await db.annotations.add(fullAnnotation)

        // Update tag counts
        await this.updateTagCounts(annotation.tags || [])
      })

      console.log('Annotation saved successfully with ID:', id)
      return id
    } catch (error) {
      console.error('Failed to save annotation:', error)
      throw new Error(`Failed to save annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get a single annotation by ID
   */
  async getAnnotation(id: string): Promise<StoredAnnotation | null> {
    await this.ensureInitialized()

    try {
      const annotation = await db.annotations.get(id)
      return annotation || null
    } catch (error) {
      console.error('Failed to get annotation:', error)
      throw new Error(`Failed to get annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get all annotations with optional filtering and sorting
   */
  async getAllAnnotations(options: QueryOptions = {}): Promise<StoredAnnotation[]> {
    await this.ensureInitialized()

    try {
      const sortBy = options.sortBy || 'createdAt'
      const sortOrder = options.sortOrder || 'desc'

      let collection: any

      // Start with the appropriate sorting
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'timestamp') {
        collection = db.annotations.orderBy(sortBy)
        if (sortOrder === 'desc') {
          collection = collection.reverse()
        }
      } else if (sortBy === 'title') {
        collection = db.annotations.toCollection().sortBy('title')
        if (sortOrder === 'desc') {
          collection = collection.reverse()
        }
      } else {
        collection = db.annotations.toCollection()
      }

      // Apply tag filtering
      if (options.tags && options.tags.length > 0) {
        collection = collection.filter(annotation =>
          annotation.tags && annotation.tags.some(tag => options.tags!.includes(tag))
        )
      }

      // Apply date range filtering
      if (options.dateFrom) {
        collection = collection.filter(annotation => annotation.createdAt >= options.dateFrom!)
      }
      if (options.dateTo) {
        collection = collection.filter(annotation => annotation.createdAt <= options.dateTo!)
      }

      // Apply pagination
      if (options.offset) {
        collection = collection.offset(options.offset)
      }
      if (options.limit) {
        collection = collection.limit(options.limit)
      }

      return await collection.toArray()
    } catch (error) {
      console.error('Failed to get annotations:', error)
      throw new Error(`Failed to get annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(id: string, updates: Partial<StoredAnnotation>): Promise<void> {
    await this.ensureInitialized()

    try {
      const existing = await db.annotations.get(id)
      if (!existing) {
        throw new Error(`Annotation with id ${id} not found`)
      }

      const updated: StoredAnnotation = {
        ...existing,
        ...updates,
        id,
        updatedAt: new Date()
      }

      await db.transaction('rw', db.annotations, db.tags, async () => {
        await db.annotations.put(updated)
      })

      // Update tag counts if tags changed
      if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(existing.tags)) {
        await this.updateAllTagCounts()
      }

      console.log('Annotation updated successfully:', id)
    } catch (error) {
      console.error('Failed to update annotation:', error)
      throw new Error(`Failed to update annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete a single annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    await this.ensureInitialized()

    try {
      const annotation = await db.annotations.get(id)

      await db.transaction('rw', db.annotations, db.annotationTags, async () => {
        // Delete the annotation
        await db.annotations.delete(id)

        // Delete related tag relationships
        await db.annotationTags.where('annotationId').equals(id).delete()
      })

      // Update tag counts
      if (annotation?.tags) {
        await this.updateAllTagCounts()
      }

      console.log('Annotation deleted successfully:', id)
    } catch (error) {
      console.error('Failed to delete annotation:', error)
      throw new Error(`Failed to delete annotation: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete multiple annotations
   */
  async deleteAnnotations(ids: string[]): Promise<void> {
    await this.ensureInitialized()

    try {
      await db.transaction('rw', db.annotations, db.annotationTags, async () => {
        // Delete annotations
        await db.annotations.bulkDelete(ids)

        // Delete related tag relationships
        for (const id of ids) {
          await db.annotationTags.where('annotationId').equals(id).delete()
        }
      })

      // Update all tag counts
      await this.updateAllTagCounts()

      console.log('Annotations deleted successfully:', ids.length)
    } catch (error) {
      console.error('Failed to delete annotations:', error)
      throw new Error(`Failed to delete annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Search annotations with various criteria
   */
  async searchAnnotations(query: SearchQuery): Promise<StoredAnnotation[]> {
    await this.ensureInitialized()

    try {
      let collection = db.annotations.toCollection()

      // Text search across multiple fields
      if (query.text) {
        const searchText = query.text.toLowerCase()
        collection = collection.filter(annotation => {
          const titleMatch = annotation.title.toLowerCase().includes(searchText)
          const descMatch = annotation.description?.toLowerCase().includes(searchText)
          const tagMatch = annotation.tags?.some(tag => tag.toLowerCase().includes(searchText))
          return titleMatch || descMatch || tagMatch
        })
      }

      // Tag filtering
      if (query.tags && query.tags.length > 0) {
        collection = collection.filter(annotation =>
          annotation.tags && query.tags!.some(tag => annotation.tags.includes(tag))
        )
      }

      // Date range filtering
      if (query.dateFrom) {
        collection = collection.filter(annotation => annotation.createdAt >= query.dateFrom!)
      }
      if (query.dateTo) {
        collection = collection.filter(annotation => annotation.createdAt <= query.dateTo!)
      }

      // Size range filtering
      if (query.minSize) {
        collection = collection.filter(annotation => annotation.fileSize >= query.minSize!)
      }
      if (query.maxSize) {
        collection = collection.filter(annotation => annotation.fileSize <= query.maxSize!)
      }

      return await collection.toArray()
    } catch (error) {
      console.error('Failed to search annotations:', error)
      throw new Error(`Failed to search annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get annotations by tag
   */
  async getAnnotationsByTag(tag: string): Promise<StoredAnnotation[]> {
    await this.ensureInitialized()

    try {
      return await db.annotations
        .filter(annotation => annotation.tags && annotation.tags.includes(tag))
        .toArray()
    } catch (error) {
      console.error('Failed to get annotations by tag:', error)
      throw new Error(`Failed to get annotations by tag: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get recent annotations
   */
  async getRecentAnnotations(limit: number = 10): Promise<StoredAnnotation[]> {
    return this.getAllAnnotations({
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    })
  }

  /**
   * Get total annotation count
   */
  async getAnnotationCount(): Promise<number> {
    await this.ensureInitialized()

    try {
      return await db.annotations.count()
    } catch (error) {
      console.error('Failed to count annotations:', error)
      throw new Error(`Failed to count annotations: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Clear all data from the database
   */
  async clear(): Promise<void> {
    await this.ensureInitialized()

    try {
      await db.transaction('rw', db.annotations, db.tags, db.annotationTags, async () => {
        await db.annotations.clear()
        await db.tags.clear()
        await db.annotationTags.clear()
      })

      console.log('Database cleared successfully')
    } catch (error) {
      console.error('Failed to clear database:', error)
      throw new Error(`Failed to clear database: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Update tag counts based on current annotations
   */
  private async updateTagCounts(tagNames: string[]): Promise<void> {
    try {
      await db.transaction('rw', db.tags, async () => {
        // Get all current annotations and their tags
        const annotations = await db.annotations.toArray()
        const allTags = new Map<string, number>()

        // Count tag usage
        for (const annotation of annotations) {
          for (const tagName of annotation.tags || []) {
            allTags.set(tagName, (allTags.get(tagName) || 0) + 1)
          }
        }

        // Update tag counts
        for (const [tagName, count] of allTags) {
          const existingTag = await db.tags.where('name').equals(tagName).first()
          if (existingTag) {
            await db.tags.update(existingTag.id, { count })
          } else {
            await db.tags.add({
              id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: tagName,
              color: this.generateTagColor(tagName),
              count,
              createdAt: new Date()
            })
          }
        }

        // Remove unused tags
        const usedTags = new Set(allTags.keys())
        const unusedTags = await db.tags.where('name').noneOf(Array.from(usedTags)).toArray()
        await db.tags.bulkDelete(unusedTags.map(tag => tag.id))
      })
    } catch (error) {
      console.error('Failed to update tag counts:', error)
      // Don't throw error here as it's not critical
    }
  }

  /**
   * Update all tag counts (more expensive operation)
   */
  private async updateAllTagCounts(): Promise<void> {
    try {
      await db.transaction('rw', db.tags, async () => {
        const annotations = await db.annotations.toArray()
        const allTags = new Map<string, number>()

        // Count tag usage
        for (const annotation of annotations) {
          for (const tagName of annotation.tags || []) {
            allTags.set(tagName, (allTags.get(tagName) || 0) + 1)
          }
        }

        // Update all tags with new counts
        for (const [tagName, count] of allTags) {
          const existingTag = await db.tags.where('name').equals(tagName).first()
          if (existingTag) {
            await db.tags.update(existingTag.id, { count })
          } else {
            await db.tags.add({
              id: `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: tagName,
              color: this.generateTagColor(tagName),
              count,
              createdAt: new Date()
            })
          }
        }

        // Remove unused tags
        const usedTags = new Set(allTags.keys())
        const allExistingTags = await db.tags.toArray()
        const unusedTags = allExistingTags.filter(tag => !usedTags.has(tag.name))
        await db.tags.bulkDelete(unusedTags.map(tag => tag.id))
      })
    } catch (error) {
      console.error('Failed to update all tag counts:', error)
    }
  }

  /**
   * Generate consistent color for tags
   */
  private generateTagColor(tagName: string): string {
    const colors = [
      '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
    ]

    let hash = 0
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Tag[]> {
    await this.ensureInitialized()

    try {
      return await db.tags.orderBy('count').reverse().toArray()
    } catch (error) {
      console.error('Failed to get tags:', error)
      throw new Error(`Failed to get tags: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Create a new tag
   */
  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'count'>): Promise<string> {
    await this.ensureInitialized()

    try {
      const id = `tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const fullTag: Tag = {
        ...tag,
        id,
        count: 0,
        createdAt: new Date()
      }

      await db.tags.add(fullTag)
      console.log('Tag created successfully:', id)
      return id
    } catch (error) {
      console.error('Failed to create tag:', error)
      throw new Error(`Failed to create tag: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    await this.ensureInitialized()

    try {
      await db.tags.update(id, updates)
      console.log('Tag updated successfully:', id)
    } catch (error) {
      console.error('Failed to update tag:', error)
      throw new Error(`Failed to update tag: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<void> {
    await this.ensureInitialized()

    try {
      await db.transaction('rw', db.tags, db.annotations, db.annotationTags, async () => {
        // Remove tag from all annotations
        const tag = await db.tags.get(id)
        if (tag) {
          const annotations = await db.annotations.filter(annotation =>
            annotation.tags && annotation.tags.includes(tag.name)
          ).toArray()

          for (const annotation of annotations) {
            const updatedTags = annotation.tags.filter(t => t !== tag.name)
            await db.annotations.update(annotation.id, { tags: updatedTags })
          }
        }

        // Delete the tag and its relationships
        await db.tags.delete(id)
        await db.annotationTags.where('tagId').equals(id).delete()
      })

      console.log('Tag deleted successfully:', id)
    } catch (error) {
      console.error('Failed to delete tag:', error)
      throw new Error(`Failed to delete tag: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Placeholder methods for future implementation
  async exportAnnotations(): Promise<any> {
    throw new Error('Not implemented yet')
  }

  async importAnnotations(data: any): Promise<void> {
    throw new Error('Not implemented yet')
  }

  async createBackup(): Promise<Blob> {
    throw new Error('Not implemented yet')
  }

  async restoreFromBackup(backup: Blob): Promise<void> {
    throw new Error('Not implemented yet')
  }
}

// Export singleton instance
export const dexieStorageService = new DexieStorageService()
