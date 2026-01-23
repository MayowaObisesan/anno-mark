/**
 * Thumbnail Generation Service
 * Handles creating optimized thumbnails from annotation images
 */

import type { 
  ThumbnailGenerationOptions, 
  ThumbnailResult 
} from '../imagekit/types'

export class ThumbnailGenerator {
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null

  constructor() {
    // Don't initialize canvas in constructor - do it lazily
  }

  /**
   * Check if canvas is supported in current environment
   */
  private isCanvasSupported(): boolean {
    return typeof document !== 'undefined' && typeof document.createElement === 'function'
  }

  /**
   * Initialize canvas and context (lazy initialization)
   */
  private initializeCanvas(): void {
    if (!this.isCanvasSupported()) {
      throw new Error('Canvas not supported in current environment. Thumbnails can only be generated in content scripts or popup contexts.')
    }

    if (!this.canvas || !this.ctx) {
      this.canvas = document.createElement('canvas')
      this.ctx = this.canvas.getContext('2d')
      
      if (!this.ctx) {
        throw new Error('Failed to get 2D context from canvas')
      }
    }
  }

  /**
   * Get canvas instance (will initialize if needed)
   */
  private getCanvas(): HTMLCanvasElement {
    this.initializeCanvas()
    return this.canvas!
  }

  /**
   * Get context instance (will initialize if needed)
   */
  private getContext(): CanvasRenderingContext2D {
    this.initializeCanvas()
    return this.ctx!
  }

  /**
   * Generate thumbnail from data URL
   */
  async generateThumbnail(
    dataUrl: string,
    options: Partial<ThumbnailGenerationOptions> = {}
  ): Promise<ThumbnailResult> {
    try {
      const defaultOptions: ThumbnailGenerationOptions = {
        width: 200,
        height: 150,
        quality: 0.7,
        format: 'webp',
        maintainAspectRatio: true
      }

      const finalOptions = { ...defaultOptions, ...options }

      // Load the image
      const img = await this.loadImage(dataUrl)
      
      // Calculate dimensions
      const { width, height } = this.calculateDimensions(
        img.width,
        img.height,
        finalOptions.width,
        finalOptions.height,
        finalOptions.maintainAspectRatio
      )

      // Set canvas size
      const canvas = this.getCanvas()
      canvas.width = width
      canvas.height = height

      // Clear canvas and draw image
      const ctx = this.getContext()
      ctx.clearRect(0, 0, width, height)
      
      // Apply smooth scaling for better quality
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to desired format
      const mimeType = this.getMimeType(finalOptions.format)
      const thumbnailDataUrl = this.canvas.toDataURL(mimeType, finalOptions.quality)

      // Calculate file size
      const thumbnailSize = this.getDataUrlSize(thumbnailDataUrl)

      return {
        success: true,
        thumbnailUrl: thumbnailDataUrl,
        thumbnailSize
      }

    } catch (error) {
      console.error('Failed to generate thumbnail:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate thumbnail'
      }
    }
  }

  /**
   * Generate thumbnail from canvas directly
   */
  async generateThumbnailFromCanvas(
    sourceCanvas: HTMLCanvasElement,
    options: Partial<ThumbnailGenerationOptions> = {}
  ): Promise<ThumbnailResult> {
    try {
      const defaultOptions: ThumbnailGenerationOptions = {
        width: 200,
        height: 150,
        quality: 0.7,
        format: 'webp',
        maintainAspectRatio: true
      }

      const finalOptions = { ...defaultOptions, ...options }

      // Calculate dimensions
      const { width, height } = this.calculateDimensions(
        sourceCanvas.width,
        sourceCanvas.height,
        finalOptions.width,
        finalOptions.height,
        finalOptions.maintainAspectRatio
      )

      // Set canvas size
      const canvas = this.getCanvas()
      canvas.width = width
      canvas.height = height

      // Clear canvas and draw from source canvas
      const ctx = this.getContext()
      ctx.clearRect(0, 0, width, height)
      
      // Apply smooth scaling
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      
      ctx.drawImage(sourceCanvas, 0, 0, width, height)

      // Convert to desired format
      const mimeType = this.getMimeType(finalOptions.format)
      const thumbnailDataUrl = canvas.toDataURL(mimeType, finalOptions.quality)

      // Calculate file size
      const thumbnailSize = this.getDataUrlSize(thumbnailDataUrl)

      return {
        success: true,
        thumbnailUrl: thumbnailDataUrl,
        thumbnailSize
      }

    } catch (error) {
      console.error('Failed to generate thumbnail from canvas:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate thumbnail from canvas'
      }
    }
  }

  /**
   * Generate multiple thumbnail sizes
   */
  async generateMultipleThumbnails(
    dataUrl: string,
    sizes: Array<{ width: number; height: number; name?: string }>
  ): Promise<{ [key: string]: ThumbnailResult }> {
    const results: { [key: string]: ThumbnailResult } = {}

    for (const size of sizes) {
      const key = size.name || `${size.width}x${size.height}`
      results[key] = await this.generateThumbnail(dataUrl, {
        width: size.width,
        height: size.height
      })
    }

    return results
  }

  /**
   * Optimize existing thumbnail
   */
  async optimizeThumbnail(
    thumbnailDataUrl: string,
    targetSize: number = 50 * 1024 // 50KB target
  ): Promise<ThumbnailResult> {
    try {
      let currentDataUrl = thumbnailDataUrl
      let currentQuality = 0.9
      let currentSize = this.getDataUrlSize(currentDataUrl)

      // Reduce quality until target size is reached or quality is too low
      while (currentSize > targetSize && currentQuality > 0.1) {
        currentQuality -= 0.1
        
        const img = await this.loadImage(currentDataUrl)
        const canvas = this.getCanvas()
        const ctx = this.getContext()
        canvas.width = img.width
        canvas.height = img.height
        
        ctx.clearRect(0, 0, img.width, img.height)
        ctx.drawImage(img, 0, 0, img.width, img.height)
        
        currentDataUrl = canvas.toDataURL('image/jpeg', currentQuality)
        currentSize = this.getDataUrlSize(currentDataUrl)
      }

      return {
        success: true,
        thumbnailUrl: currentDataUrl,
        thumbnailSize: currentSize
      }

    } catch (error) {
      console.error('Failed to optimize thumbnail:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to optimize thumbnail'
      }
    }
  }

  /**
   * Load image from data URL
   */
  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = dataUrl
    })
  }

  /**
   * Calculate thumbnail dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    sourceWidth: number,
    sourceHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return { width: maxWidth, height: maxHeight }
    }

    const aspectRatio = sourceWidth / sourceHeight

    let width = maxWidth
    let height = maxHeight

    if (sourceWidth > sourceHeight) {
      // Landscape
      height = Math.round(maxWidth / aspectRatio)
      if (height > maxHeight) {
        height = maxHeight
        width = Math.round(maxHeight * aspectRatio)
      }
    } else {
      // Portrait
      width = Math.round(maxHeight * aspectRatio)
      if (width > maxWidth) {
        width = maxWidth
        height = Math.round(maxWidth / aspectRatio)
      }
    }

    return { width, height }
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format: string): string {
    switch (format.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg'
      case 'png':
        return 'image/png'
      case 'webp':
        return 'image/webp'
      default:
        return 'image/jpeg'
    }
  }

  /**
   * Get approximate file size from data URL
   */
  private getDataUrlSize(dataUrl: string): number {
    const base64Data = dataUrl.split(',')[1] || ''
    return Math.round(base64Data.length * 0.75) // Approximate size
  }

  /**
   * Check if WebP is supported
   */
  static isWebPSupported(): boolean {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      return false // Canvas not available, assume WebP not supported
    }
    
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0
    } catch (error) {
      return false // If anything fails, assume WebP not supported
    }
  }

  /**
   * Get best format for current browser
   */
  static getBestFormat(): 'webp' | 'jpeg' {
    return this.isWebPSupported() ? 'webp' : 'jpeg'
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }
}

// Export singleton instance
export const thumbnailGenerator = new ThumbnailGenerator()
