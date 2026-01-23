/**
 * ImageKit Configuration Service
 * Handles ImageKit SDK initialization and configuration
 */

import ImageKit from '@imagekit/javascript'

export interface ImageKitConfig {
  urlEndpoint: string
  publicKey: string
  authenticationEndpoint?: string
  privateKey?: string
}

export interface ImageKitCredentials {
  urlEndpoint: string
  publicKey: string
  privateKey?: string
}

class ImageKitConfigService {
  private instance: ImageKit | null = null
  private config: ImageKitConfig | null = null

  /**
   * Initialize ImageKit with credentials
   */
  async initialize(credentials: ImageKitCredentials): Promise<void> {
    try {
      this.config = {
        urlEndpoint: credentials.urlEndpoint,
        publicKey: credentials.publicKey,
        // For browser-based uploads, we'll use public key only
        // Private key should only be used server-side
      }

      this.instance = new ImageKit({
        urlEndpoint: this.config.urlEndpoint,
        publicKey: this.config.publicKey,
        // Note: In production, you might want to use authenticationEndpoint
        // for secure signed uploads
      })

      console.log('ImageKit initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ImageKit:', error)
      throw new Error(`ImageKit initialization failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get ImageKit instance
   */
  getInstance(): ImageKit {
    if (!this.instance) {
      const errorMsg = 'ImageKit not initialized. Call initialize() first. Check that your environment variables are set correctly: PLASMO_PUBLIC_IMAGEKIT_URL_ENDPOINT and PLASMO_PUBLIC_IMAGEKIT_PUBLIC_KEY'
      console.error(errorMsg, {
        hasConfig: !!this.config,
        config: this.config ? {
          hasUrlEndpoint: !!this.config.urlEndpoint,
          hasPublicKey: !!this.config.publicKey
        } : null
      })
      throw new Error(errorMsg)
    }
    return this.instance
  }

  /**
   * Get current configuration
   */
  getConfig(): ImageKitConfig | null {
    return this.config
  }

  /**
   * Check if ImageKit is initialized
   */
  isInitialized(): boolean {
    return this.instance !== null
  }

  /**
   * Generate a unique folder path for uploads
   */
  generateFolderPath(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    
    // Using a generic user folder since we don't have user authentication
    // In a real app, this would be /anno-mark/{userId}/{year}/{month}/{day}/
    return `/anno-mark/browser/${year}/${month}/${day}/`
  }

  /**
   * Generate a unique filename
   */
  generateFilename(extension: string = 'png'): string {
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substr(2, 9)
    return `${timestamp}-${randomId}.${extension}`
  }

  /**
   * Get ImageKit upload URL with transformations
   */
  getTransformedUrl(url: string, options: {
    width?: number
    height?: number
    quality?: number
    format?: string
  } = {}): string {
    const params = new URLSearchParams()
    
    if (options.width) params.append('w', options.width.toString())
    if (options.height) params.append('h', options.height.toString())
    if (options.quality) params.append('q', options.quality.toString())
    if (options.format) params.append('f', options.format)
    
    const queryString = params.toString()
    return queryString ? `${url}?${queryString}` : url
  }

  /**
   * Validate ImageKit configuration
   */
  validateConfig(credentials: ImageKitCredentials): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    
    if (!credentials.urlEndpoint) {
      errors.push('URL endpoint is required')
    } else if (!credentials.urlEndpoint.startsWith('https://ik.imagekit.io/')) {
      errors.push('URL endpoint must be a valid ImageKit URL')
    }
    
    if (!credentials.publicKey) {
      errors.push('Public key is required')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Export singleton instance
export const imagekitConfigService = new ImageKitConfigService()

// Default credentials for development (should be overridden by environment variables)
export const DEFAULT_CREDENTIALS: ImageKitCredentials = {
  urlEndpoint: process.env.PLASMO_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  publicKey: process.env.PLASMO_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || ''
}
