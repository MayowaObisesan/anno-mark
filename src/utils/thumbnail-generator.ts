/**
 * Thumbnail Generation Utility for Anno-Mark
 * Provides mobile-first thumbnail generation for local storage
 */

export interface ThumbnailOptions {
  width?: number
  height?: number
  quality?: number
}

/**
 * Generate a thumbnail from a data URL with optional dimensions and quality
 */
export async function generateThumbnail(
  dataUrl: string,
  options: ThumbnailOptions = {}
): Promise<string> {
  const { width = 200, height = 150, quality = 0.8 } = options

  // Check if DOM APIs (document and Image) are available (not available in Chrome extension background context)
  const isDOMAvailable = typeof document !== 'undefined' && typeof Image !== 'undefined'

  if (!isDOMAvailable) {
    // Fallback: Return original data URL when DOM APIs are not available
    console.warn('DOM APIs not available for thumbnail generation, returning original data URL')
    return dataUrl
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Canvas context not available'))
        return
      }

      // Calculate aspect ratio to preserve proportions
      const aspectRatio = img.width / img.height
      let targetWidth = width
      let targetHeight = height

      if (img.width > img.height) {
        targetHeight = width / aspectRatio
      } else {
        targetWidth = height * aspectRatio
      }

      canvas.width = targetWidth
      canvas.height = targetHeight

      // Draw and resize image
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

      // Convert to compressed data URL
      const thumbnailDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(thumbnailDataUrl)
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail generation'))
    }

    img.src = dataUrl
  })
}

/**
 * Generate multiple thumbnail sizes for responsive design
 */
export async function generateResponsiveThumbnails(
  dataUrl: string,
  sizes: { width: number; height: number; quality?: number }[]
): Promise<Array<{ width: number; height: number; dataUrl: string }>> {
  const promises = sizes.map(({ width, height, quality = 0.8 }) =>
    generateThumbnail(dataUrl, { width, height, quality }).then(dataUrl => ({
      width,
      height,
      dataUrl
    }))
  )

  return Promise.all(promises)
}

/**
 * Validate thumbnail dimensions
 */
export function validateThumbnailDimensions(
  width: number,
  height: number
): boolean {
  return width > 0 && width <= 1000 && height > 0 && height <= 1000
}
