;
/**
 * ImageKit Service for Anno-Mark
 * Provides cloud storage functionality with ImageKit
 */
import type { UploadResponse } from "@imagekit/javascript";
import ImageKit from '@imagekit/nodejs';



import type { StoredAnnotation } from "~services/indexeddb-storage";





// Error classes for ImageKit operations
export class ImageKitServiceError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message)
    this.name = 'ImageKitServiceError'
  }
}

export interface ImageKitConfig {
  urlEndpoint: string
  publicKey: string
  privateKey: string
}

export interface ImageKitUploadResult {
  fileId: string
  fileName: string
  url: string
  thumbnailUrl?: string
  fileType: string
  fileSize: number
}

// Interface for ImageKit upload options (subset used by our implementation)
export interface UploadOptions {
  folder?: string
  useUniqueFileName?: boolean
  isPrivateFile?: boolean
  tags?: string[] | string
  customCoordinates?: string
  responseFields?: string[] | string
  extensions?: any[]
  webhookUrl?: string
  overwriteFile?: boolean
  overwriteAITags?: boolean
  overwriteTags?: boolean
  overwriteCustomMetadata?: boolean
  customMetadata?: any
  transformation?: any
  checks?: string
}

class ImageKitService {
  private config: ImageKitConfig
  private client: ImageKit

  constructor() {
    this.config = {
      urlEndpoint: process.env.PLASMO_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
      publicKey: process.env.PLASMO_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
      privateKey: process.env.PLASMO_PUBLIC_IMAGEKIT_PRIVATE_KEY!
    }

    this.client = new ImageKit({
      privateKey: this.config.privateKey
    })
  }

  /**
   * Upload image to ImageKit
   */
  async uploadImage(
    file: File | Blob,
    fileName: string,
    options?: Partial<UploadOptions>,
    retries = 3
  ): Promise<ImageKitUploadResult> {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.performUpload(file, fileName, options)
      } catch (error) {
        console.error(`ImageKit upload attempt ${i + 1} failed:`, error)

        if (i === retries - 1) {
          throw new ImageKitServiceError(
            "Failed to upload image after multiple attempts",
            error as Error
          )
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        )
      }
    }

    throw new ImageKitServiceError("Upload failed")
  }

  /**
   * Perform the actual upload using Fetch API (service worker compatible)
   */
  private async performUpload(
    file: File | Blob,
    fileName: string,
    options?: Partial<UploadOptions>
  ): Promise<ImageKitUploadResult> {
    const result = await this.client.files.upload({
      file: file, //required
      fileName: fileName, //required
      // folder: "anno-marks", // use the name of the user
      description: "",
      // tags: ["tag1", "tag2"]
    })
    console.log("[perform upload] using client--", result)

    /*// Generate authentication parameters (token, signature, expire)
    const authParams = await this.generateAuthParams()
    console.log("[perform upload] handler - file", file)

    // Create FormData for upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileName", fileName)
    formData.append("token", authParams.token)
    formData.append("signature", authParams.signature)
    formData.append("expire", authParams.expire.toString())
    formData.append("publicKey", this.config.publicKey)
    formData.append("folder", options?.folder || "/anno-mark")
    formData.append(
      "useUniqueFileName",
      options?.useUniqueFileName?.toString() || "true"
    )

    // Add optional parameters
    if (options?.isPrivateFile) {
      formData.append("isPrivateFile", options.isPrivateFile.toString())
    }
    if (options?.tags) {
      const tags = Array.isArray(options.tags)
        ? options.tags.join(",")
        : options.tags
      formData.append("tags", tags)
    }
    if (options?.customCoordinates) {
      formData.append("customCoordinates", options.customCoordinates)
    }
    if (options?.responseFields) {
      const responseFields = Array.isArray(options.responseFields)
        ? options.responseFields.join(",")
        : options.responseFields
      formData.append("responseFields", responseFields)
    }
    if (options?.webhookUrl) {
      formData.append("webhookUrl", options.webhookUrl)
    }
    if (options?.overwriteFile !== undefined) {
      formData.append("overwriteFile", options.overwriteFile.toString())
    }
    if (options?.overwriteAITags !== undefined) {
      formData.append("overwriteAITags", options.overwriteAITags.toString())
    }
    if (options?.overwriteTags !== undefined) {
      formData.append("overwriteTags", options.overwriteTags.toString())
    }
    if (options?.overwriteCustomMetadata !== undefined) {
      formData.append(
        "overwriteCustomMetadata",
        options.overwriteCustomMetadata.toString()
      )
    }
    if (options?.customMetadata) {
      formData.append("customMetadata", JSON.stringify(options.customMetadata))
    }
    if (options?.checks) {
      formData.append("checks", options.checks)
    }

    console.log("[perform upload] handler - before fetch")

    const response = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData
      }
    )

    console.log("[perform upload] handler - response received")

    if (!response.ok) {
      const errorText = await response.text()
      console.error("ImageKit API error:", errorText)
      throw new ImageKitServiceError(
        `Upload failed with status ${response.status}: ${errorText}`
      )
    }

    const data: UploadResponse = await response.json()

    console.log(
      "[perform upload] handler - data received - thumbnail",
      data.url,
      this.generateThumbnailUrl(data.url)
    )*/

    return {
      fileId: result.fileId,
      fileName: result.name,
      url: result.url,
      thumbnailUrl: result.thumbnailUrl,
      fileType: result.fileType,
      fileSize: result.size || file.size
    }
  }

  /**
   * Generate optimized image URL with transformation parameters
   */
  public generateOptimizedUrl(
    url: string,
    options: {
      width?: number
      height?: number
      format?: "jpg" | "png" | "webp"
      quality?: number
      crop?: "at_max" | "at_min" | "fit"
    } = {}
  ): string {
    const { width, height, format, quality = 80, crop = "at_max" } = options

    const transformations = []

    if (width && height) {
      transformations.push(`w-${width},h-${height},c-${crop}`)
    } else if (width) {
      transformations.push(`w-${width}`)
    } else if (height) {
      transformations.push(`h-${height}`)
    }

    if (format) {
      transformations.push(`f-${format}`)
    }

    if (quality) {
      transformations.push(`q-${quality}`)
    }

    if (transformations.length === 0) {
      return url
    }

    const transformation = `tr:${transformations.join(",")}`
    const separator = url.includes("?") ? "&" : "?"
    return `${url}${separator}${transformation}`
  }

  /**
   * Generate thumbnail URL from full ImageKit URL
   */
  private generateThumbnailUrl(url: string): string {
    return this.generateOptimizedUrl(url, {
      width: 200,
      height: 150,
      quality: 70,
      format: "webp"
    })
  }

  /**
   * Generate authentication parameters for upload
   */
  private async generateAuthParams() {
    const token =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    const expire = Math.floor(Date.now() / 1000) + 3600 // 1 hour
    const signature = await this.generateSignature(token, expire)

    return { token, expire, signature }
  }

  /**
   * Generate HMAC-SHA1 signature for ImageKit
   */
  private async generateSignature(
    token: string,
    expire: number
  ): Promise<string> {
    // Use Web Crypto API for browser-side hashing
    const _crypto = crypto.subtle

    return new Promise((resolve, reject) => {
      const data = token + expire
      const key = this.config.privateKey

      // Convert key and data to ArrayBuffer
      const keyBuffer = new TextEncoder().encode(key)
      const dataBuffer = new TextEncoder().encode(data)

      _crypto
        .importKey(
          "raw",
          keyBuffer,
          { name: "HMAC", hash: { name: "SHA-1" } },
          false,
          ["sign"]
        )
        .then((importedKey) => {
          _crypto
            .sign("HMAC", importedKey, dataBuffer)
            .then((signatureBuffer) => {
              // Convert ArrayBuffer to hex string
              const signatureArray = new Uint8Array(signatureBuffer)
              const signatureHex = Array.from(signatureArray)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("")
              resolve(signatureHex)
            })
            .catch(reject)
        })
        .catch(reject)
    })
  }

  /**
   * Delete image from ImageKit
   */
  async deleteImage(fileId: string): Promise<void> {
    // Implementation for delete functionality
    // Would require server-side endpoint to avoid exposing private key
    console.warn("ImageKit delete not implemented due to security constraints")
  }

  /**
   * Sync local annotations with ImageKit cloud storage
   */
  async syncAnnotations(
    annotations: StoredAnnotation[]
  ): Promise<
    Array<{ annotation: StoredAnnotation; success: boolean; error?: string }>
  > {
    const syncResults = []

    for (const annotation of annotations) {
      try {
        // Skip if already uploaded
        if (annotation.isUploaded && annotation.imageKitFileId) {
          syncResults.push({ annotation, success: true })
          continue
        }

        // Upload to ImageKit if not already uploaded
        if (annotation.dataUrl) {
          // Convert dataUrl to Blob
          const response = await fetch(annotation.dataUrl)
          const blob = await response.blob()
          const file = new File([blob], `annotation-${annotation.id}.png`, {
            type: "image/png"
          })

          const imageKitResult = await this.uploadImage(file, file.name)

          syncResults.push({
            annotation: {
              ...annotation,
              imageKitFileId: imageKitResult.fileId,
              imageKitUrl: imageKitResult.url,
              imageKitThumbnailUrl: imageKitResult.thumbnailUrl,
              isUploaded: true
            },
            success: true
          })
        } else {
          syncResults.push({
            annotation,
            success: false,
            error: "No data URL available for upload"
          })
        }
      } catch (error) {
        console.error(`Failed to sync annotation ${annotation.id}:`, error)
        syncResults.push({
          annotation,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    return syncResults
  }

  /**
   * Check if ImageKit service is configured and available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { urlEndpoint, publicKey, privateKey } = this.config
      return !!(urlEndpoint && publicKey && privateKey)
    } catch (error) {
      return false
    }
  }

  /**
   * Get ImageKit configuration (excluding private key for security)
   */
  getConfig(): Omit<ImageKitConfig, "privateKey"> {
    return {
      urlEndpoint: this.config.urlEndpoint,
      publicKey: this.config.publicKey
    }
  }

  /**
   * Update ImageKit configuration
   */
  updateConfig(config: Partial<ImageKitConfig>): void {
    this.config = {
      ...this.config,
      ...config
    }
  }
}

export const imageKitService = new ImageKitService()
