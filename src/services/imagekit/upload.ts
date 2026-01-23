/**
 * ImageKit Upload Service
 * Handles uploading images to ImageKit cloud storage
 */

import ImageKit from '@imagekit/javascript'
import type { 
  ImageKitUploadOptions, 
  ImageKitUploadResponse, 
  ImageKitError, 
  UploadResult, 
  UploadProgress 
} from './types'
import { imagekitConfigService } from './config'

export class ImageKitUploadService {
  private imageKit: ImageKit | null = null

  constructor() {
    // Don't get instance in constructor - get it lazily when needed
  }

  /**
   * Get ImageKit instance (lazy initialization)
   */
  private getImageKit(): ImageKit {
    if (!this.imageKit) {
      this.imageKit = imagekitConfigService.getInstance()
    }
    return this.imageKit
  }

  /**
   * Upload a file to ImageKit
   */
  async uploadFile(
    options: ImageKitUploadOptions,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Get ImageKit instance (will throw if not initialized)
      const imageKit = this.getImageKit()

      // Validate file size (10MB limit for free tier)
      const maxSize = 10 * 1024 * 1024 // 10MB
      if (options.file.size > maxSize) {
        throw new Error(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`)
      }

      // Prepare upload parameters
      const uploadParams: any = {
        file: options.file,
        fileName: options.fileName,
        folder: options.folder || 'anno-mark',
        useUniqueFileName: options.useUniqueFileName !== false,
        isPrivateFile: options.isPrivateFile || false,
        tags: options.tags || [],
        responseFields: options.responseFields || [
          'fileId',
          'name',
          'url',
          'size',
          'width',
          'height',
          'thumbnailUrl',
          'mimeType',
          'createdAt',
          'updatedAt'
        ]
      }

      // Add custom metadata
      const customMetadata = {
        source: 'anno-mark-extension',
        uploadedAt: new Date().toISOString(),
        version: '1.0.0'
      }

      return new Promise((resolve) => {
        imageKit.upload(uploadParams, (error: ImageKitError | null, result: ImageKitUploadResponse | null) => {
          if (error) {
            console.error('ImageKit upload failed:', error)
            resolve({
              success: false,
              error: {
                message: error.message,
                code: error.code,
                requestId: error.requestId
              }
            })
          } else if (result) {
            console.log('ImageKit upload successful:', result)
            resolve({
              success: true,
              data: result,
              fileId: result.fileId,
              url: result.url,
              thumbnailUrl: result.thumbnailUrl
            })
          } else {
            resolve({
              success: false,
              error: {
                message: 'Unknown upload error'
              }
            })
          }
        })
      })

    } catch (error) {
      console.error('Upload failed:', error)
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown upload error'
        }
      }
    }
  }

  /**
   * Upload from data URL (base64)
   */
  async uploadFromDataUrl(
    dataUrl: string,
    fileName: string,
    folder?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Convert data URL to Blob
      const blob = this.dataUrlToBlob(dataUrl)
      const file = new File([blob], fileName, { type: 'image/png' })

      return this.uploadFile({
        file,
        fileName,
        folder,
        tags: ['anno-mark', 'annotation']
      }, onProgress)

    } catch (error) {
      console.error('Failed to upload from data URL:', error)
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to process image data'
        }
      }
    }
  }

  /**
   * Upload with retry logic
   */
  async uploadWithRetry(
    options: ImageKitUploadOptions,
    maxRetries: number = 3,
    retryDelay: number = 1000,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    let lastError: ImageKitError | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Upload attempt ${attempt}/${maxRetries}`)
        const result = await this.uploadFile(options, onProgress)
        
        if (result.success) {
          return result
        }

        lastError = result.error || null

        // Don't retry on certain error types
        if (lastError?.code === 'FILE_TOO_LARGE' || lastError?.code === 'INVALID_FILE_TYPE') {
          break
        }

        if (attempt < maxRetries) {
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, attempt - 1)
          console.log(`Retrying upload in ${delay}ms...`)
          await this.sleep(delay)
        }

      } catch (error) {
        lastError = {
          message: error instanceof Error ? error.message : 'Unknown error'
        }
        
        if (attempt < maxRetries) {
          const delay = retryDelay * Math.pow(2, attempt - 1)
          await this.sleep(delay)
        }
      }
    }

    return {
      success: false,
      error: lastError || {
        message: `Upload failed after ${maxRetries} attempts`
      }
    }
  }

  /**
   * Delete a file from ImageKit
   */
  async deleteFile(fileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get ImageKit instance (will throw if not initialized)
      const imageKit = this.getImageKit()

      return new Promise((resolve) => {
        imageKit.deleteFile(fileId, (error: ImageKitError | null) => {
          if (error) {
            console.error('Failed to delete file:', error)
            resolve({
              success: false,
              error: error.message
            })
          } else {
            console.log('File deleted successfully:', fileId)
            resolve({ success: true })
          }
        })
      })

    } catch (error) {
      console.error('Delete failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file'
      }
    }
  }

  /**
   * Get file metadata from ImageKit
   */
  async getFileMetadata(fileId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Get ImageKit instance (will throw if not initialized)
      const imageKit = this.getImageKit()

      return new Promise((resolve) => {
        imageKit.getFileInfo(fileId, (error: ImageKitError | null, result: any) => {
          if (error) {
            console.error('Failed to get file metadata:', error)
            resolve({
              success: false,
              error: error.message
            })
          } else {
            resolve({
              success: true,
              data: result
            })
          }
        })
      })

    } catch (error) {
      console.error('Get metadata failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get file metadata'
      }
    }
  }

  /**
   * Convert data URL to Blob
   */
  private dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',')
    const mime = arr[0].match(/:(.*?);/)![1]
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n)
    }
    
    return new Blob([u8arr], { type: mime })
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Wait for network connection
   */
  async waitForConnection(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now()
    
    while (!navigator.onLine) {
      if (Date.now() - startTime > timeout) {
        return false
      }
      await this.sleep(1000)
    }
    
    return true
  }
}

// Export singleton instance
export const imagekitUploadService = new ImageKitUploadService()
