/**
 * IndexedDB Storage Service for Anno-Mark
 * Provides persistent storage for annotation exports with large capacity and efficient querying
 */

// Database and store names
const DB_NAME = 'AnnoMarkDB'
const DB_VERSION = 1
const ANNOTATIONS_STORE = 'annotations'
const TAGS_STORE = 'tags'
const SETTINGS_STORE = 'settings'

// Storage interfaces
export interface StoredAnnotation {
  id: string                    // Primary key
  dataUrl: string               // Base64 image data
  width: number
  height: number
  timestamp: number
  url: string                   // Source page URL
  title: string                 // Page title
  tags: string[]                // User-defined tags
  description?: string          // User notes
  createdAt: Date
  updatedAt: Date
  fileSize: number              // Size in bytes
  mimeType: string              // Usually "image/png"
}

export interface Tag {
  id: string                    // Primary key
  name: string                  // Tag name
  color: string                 // Display color
  count: number                 // Number of annotations with this tag
  createdAt: Date
}

export interface DatabaseSettings {
  version: number               // Database version
  defaultTags: string[]         // Default tags for new annotations
  autoCleanup: boolean          // Auto-cleanup old annotations
  maxAnnotations: number        // Maximum annotations to store
  compressionEnabled: boolean   // Enable data compression
}

export interface StorageInfo {
  quota: number                 // Total storage quota in bytes
  usage: number                 // Current usage in bytes
  available: number             // Available space in bytes
  annotationCount: number       // Number of stored annotations
}

export interface QueryOptions {
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'updatedAt' | 'timestamp' | 'title'
  sortOrder?: 'asc' | 'desc'
  tags?: string[]
  dateFrom?: Date
  dateTo?: Date
}

export interface SearchQuery {
  text?: string                 // Search in title, description, tags
  tags?: string[]              // Filter by tags
  dateFrom?: Date
  dateTo?: Date
  minSize?: number
  maxSize?: number
}

export interface ExportData {
  annotations: StoredAnnotation[]
  tags: Tag[]
  settings: DatabaseSettings
  exportedAt: Date
  version: string
}

class IndexedDBStorageService {
  private db: IDBDatabase | null = null
  private isInitialized = false

  /**
   * Initialize the IndexedDB database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized && this.db) {
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error)
        reject(new Error(`Failed to open database: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        this.isInitialized = true
        console.log('IndexedDB initialized successfully')
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create annotations store
        if (!db.objectStoreNames.contains(ANNOTATIONS_STORE)) {
          const annotationsStore = db.createObjectStore(ANNOTATIONS_STORE, { keyPath: 'id' })
          annotationsStore.createIndex('createdAt', 'createdAt', { unique: false })
          annotationsStore.createIndex('updatedAt', 'updatedAt', { unique: false })
          annotationsStore.createIndex('timestamp', 'timestamp', { unique: false })
          annotationsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true })
          annotationsStore.createIndex('url', 'url', { unique: false })
        }

        // Create tags store
        if (!db.objectStoreNames.contains(TAGS_STORE)) {
          const tagsStore = db.createObjectStore(TAGS_STORE, { keyPath: 'id' })
          tagsStore.createIndex('name', 'name', { unique: true })
          tagsStore.createIndex('count', 'count', { unique: false })
        }

        // Create settings store
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'id' })
        }

        console.log('IndexedDB schema upgraded')
      }
    })
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    if (!this.isInitialized || !this.db) {
      await this.initialize()
    }
    if (!this.db) {
      throw new Error('Database initialization failed')
    }
    return this.db
  }

  /**
   * Get storage information including quota and usage
   */
  async getStorageInfo(): Promise<StorageInfo> {
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
   * Save an annotation to IndexedDB
   */
  async saveAnnotation(annotation: Omit<StoredAnnotation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const db = await this.ensureInitialized()
    
    const id = `annotation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date()
    
    const fullAnnotation: StoredAnnotation = {
      ...annotation,
      id,
      createdAt: now,
      updatedAt: now
    }

    // Calculate file size
    const base64Data = annotation.dataUrl.split(',')[1] || ''
    fullAnnotation.fileSize = Math.round(base64Data.length * 0.75) // Approximate size

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE, TAGS_STORE], 'readwrite')
      const annotationsStore = transaction.objectStore(ANNOTATIONS_STORE)
      const tagsStore = transaction.objectStore(TAGS_STORE)

      const request = annotationsStore.put(fullAnnotation)

      request.onsuccess = () => {
        // Update tag counts
        this.updateTagCounts(tagsStore, annotation.tags)
        resolve(id)
      }

      request.onerror = () => {
        console.error('Failed to save annotation:', request.error)
        reject(new Error(`Failed to save annotation: ${request.error?.message}`))
      }
    })
  }

  /**
   * Get a single annotation by ID
   */
  async getAnnotation(id: string): Promise<StoredAnnotation | null> {
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE], 'readonly')
      const store = transaction.objectStore(ANNOTATIONS_STORE)
      const request = store.get(id)

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        console.error('Failed to get annotation:', request.error)
        reject(new Error(`Failed to get annotation: ${request.error?.message}`))
      }
    })
  }

  /**
   * Get all annotations with optional filtering
   */
  async getAllAnnotations(options: QueryOptions = {}): Promise<StoredAnnotation[]> {
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE], 'readonly')
      const store = transaction.objectStore(ANNOTATIONS_STORE)
      
      let request: IDBRequest
      const sortBy = options.sortBy || 'createdAt'
      const sortOrder = options.sortOrder || 'desc'
      
      if (sortBy === 'createdAt' || sortBy === 'updatedAt' || sortBy === 'timestamp') {
        request = store.index(sortBy).openCursor(null, sortOrder)
      } else {
        request = store.openCursor(null, sortOrder === 'desc' ? 'prev' : 'next')
      }

      const annotations: StoredAnnotation[] = []
      let count = 0
      let skipped = 0

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        
        if (cursor) {
          const annotation = cursor.value as StoredAnnotation
          
          // Apply filters
          if (this.matchesFilters(annotation, options)) {
            if (skipped >= (options.offset || 0)) {
              annotations.push(annotation)
              count++
              
              if (options.limit && count >= options.limit) {
                resolve(annotations)
                return
              }
            } else {
              skipped++
            }
          }
          
          cursor.continue()
        } else {
          resolve(annotations)
        }
      }

      request.onerror = () => {
        console.error('Failed to get annotations:', request.error)
        reject(new Error(`Failed to get annotations: ${request.error?.message}`))
      }
    })
  }

  /**
   * Update an existing annotation
   */
  async updateAnnotation(id: string, updates: Partial<StoredAnnotation>): Promise<void> {
    const db = await this.ensureInitialized()
    
    const existing = await this.getAnnotation(id)
    if (!existing) {
      throw new Error(`Annotation with id ${id} not found`)
    }

    const updated: StoredAnnotation = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date()
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE, TAGS_STORE], 'readwrite')
      const annotationsStore = transaction.objectStore(ANNOTATIONS_STORE)
      const tagsStore = transaction.objectStore(TAGS_STORE)

      const request = annotationsStore.put(updated)

      request.onsuccess = () => {
        // Update tag counts if tags changed
        if (updates.tags && JSON.stringify(updates.tags) !== JSON.stringify(existing.tags)) {
          this.updateTagCounts(tagsStore, updates.tags || [])
        }
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to update annotation:', request.error)
        reject(new Error(`Failed to update annotation: ${request.error?.message}`))
      }
    })
  }

  /**
   * Delete a single annotation
   */
  async deleteAnnotation(id: string): Promise<void> {
    const db = await this.ensureInitialized()
    
    const annotation = await this.getAnnotation(id)
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE, TAGS_STORE], 'readwrite')
      const annotationsStore = transaction.objectStore(ANNOTATIONS_STORE)
      const tagsStore = transaction.objectStore(TAGS_STORE)

      const request = annotationsStore.delete(id)

      request.onsuccess = () => {
        // Update tag counts
        if (annotation) {
          this.updateTagCounts(tagsStore, [])
        }
        resolve()
      }

      request.onerror = () => {
        console.error('Failed to delete annotation:', request.error)
        reject(new Error(`Failed to delete annotation: ${request.error?.message}`))
      }
    })
  }

  /**
   * Delete multiple annotations
   */
  async deleteAnnotations(ids: string[]): Promise<void> {
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE, TAGS_STORE], 'readwrite')
      const annotationsStore = transaction.objectStore(ANNOTATIONS_STORE)
      
      let completed = 0
      let errors = 0

      ids.forEach(id => {
        const request = annotationsStore.delete(id)
        
        request.onsuccess = () => {
          completed++
          if (completed + errors === ids.length) {
            if (errors === 0) {
              resolve()
            } else {
              reject(new Error(`${errors} deletions failed`))
            }
          }
        }
        
        request.onerror = () => {
          errors++
          console.error(`Failed to delete annotation ${id}:`, request.error)
          if (completed + errors === ids.length) {
            reject(new Error(`${errors} deletions failed`))
          }
        }
      })

      // Update tag counts after all deletions
      transaction.oncomplete = () => {
        this.updateAllTagCounts()
      }
    })
  }

  /**
   * Search annotations with various criteria
   */
  async searchAnnotations(query: SearchQuery): Promise<StoredAnnotation[]> {
    const allAnnotations = await this.getAllAnnotations()
    
    return allAnnotations.filter(annotation => {
      // Text search
      if (query.text) {
        const searchText = query.text.toLowerCase()
        const titleMatch = annotation.title.toLowerCase().includes(searchText)
        const descMatch = annotation.description?.toLowerCase().includes(searchText)
        const tagMatch = annotation.tags.some(tag => tag.toLowerCase().includes(searchText))
        
        if (!titleMatch && !descMatch && !tagMatch) {
          return false
        }
      }

      // Tag filter
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => annotation.tags.includes(tag))
        if (!hasAllTags) {
          return false
        }
      }

      // Date range
      if (query.dateFrom && annotation.createdAt < query.dateFrom) {
        return false
      }
      if (query.dateTo && annotation.createdAt > query.dateTo) {
        return false
      }

      // Size range
      if (query.minSize && annotation.fileSize < query.minSize) {
        return false
      }
      if (query.maxSize && annotation.fileSize > query.maxSize) {
        return false
      }

      return true
    })
  }

  /**
   * Get annotations by tag
   */
  async getAnnotationsByTag(tag: string): Promise<StoredAnnotation[]> {
    return this.searchAnnotations({ tags: [tag] })
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
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE], 'readonly')
      const store = transaction.objectStore(ANNOTATIONS_STORE)
      const request = store.count()

      request.onsuccess = () => {
        resolve(request.result)
      }

      request.onerror = () => {
        console.error('Failed to count annotations:', request.error)
        reject(new Error(`Failed to count annotations: ${request.error?.message}`))
      }
    })
  }

  /**
   * Clear all data from the database
   */
  async clear(): Promise<void> {
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ANNOTATIONS_STORE, TAGS_STORE, SETTINGS_STORE], 'readwrite')
      
      let completed = 0
      const stores = [ANNOTATIONS_STORE, TAGS_STORE, SETTINGS_STORE]

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => {
          completed++
          if (completed === stores.length) {
            resolve()
          }
        }
        
        request.onerror = () => {
          console.error(`Failed to clear store ${storeName}:`, request.error)
          reject(new Error(`Failed to clear store ${storeName}: ${request.error?.message}`))
        }
      })
    })
  }

  /**
   * Helper method to check if annotation matches query options
   */
  private matchesFilters(annotation: StoredAnnotation, options: QueryOptions): boolean {
    // Tag filter
    if (options.tags && options.tags.length > 0) {
      const hasAnyTag = options.tags.some(tag => annotation.tags.includes(tag))
      if (!hasAnyTag) {
        return false
      }
    }

    // Date range
    if (options.dateFrom && annotation.createdAt < options.dateFrom) {
      return false
    }
    if (options.dateTo && annotation.createdAt > options.dateTo) {
      return false
    }

    return true
  }

  /**
   * Update tag counts based on current annotations
   */
  private async updateTagCounts(tagsStore: IDBObjectStore, newTags: string[]): Promise<void> {
    // This is a simplified implementation
    // In a full implementation, you'd want to recalculate all tag counts
    const request = tagsStore.getAll()
    
    request.onsuccess = () => {
      const tags = request.result as Tag[]
      // Update logic would go here
    }
  }

  /**
   * Update all tag counts
   */
  private async updateAllTagCounts(): Promise<void> {
    // Implementation for recalculating all tag counts
    // This would scan all annotations and update tag usage counts
  }

  // Tag management methods (simplified for now)
  async getAllTags(): Promise<Tag[]> {
    const db = await this.ensureInitialized()
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TAGS_STORE], 'readonly')
      const store = transaction.objectStore(TAGS_STORE)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        console.error('Failed to get tags:', request.error)
        reject(new Error(`Failed to get tags: ${request.error?.message}`))
      }
    })
  }

  // Placeholder methods for future implementation
  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'count'>): Promise<string> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async updateTag(id: string, updates: Partial<Tag>): Promise<void> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async deleteTag(id: string): Promise<void> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async exportAnnotations(): Promise<ExportData> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async importAnnotations(data: ExportData): Promise<void> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async createBackup(): Promise<Blob> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }

  async restoreFromBackup(backup: Blob): Promise<void> {
    // Implementation needed
    throw new Error('Not implemented yet')
  }
}

// Export singleton instance
export const indexedDBStorageService = new IndexedDBStorageService()
