import type { PlasmoMessaging } from "@plasmohq/messaging"
import { storageService } from "~services/storage"
import { dexieStorageService } from "~services/dexie-storage"
import { imageKitService } from "~services/imagekit-service"
import { generateThumbnail } from "~utils/thumbnail-generator"
import { isUserAuthenticated, getCurrentConvexUserId } from "~services/convex-auth"
import { convexStorageService } from "~services/convex-storage"
import type { StoredAnnotationWithConvex } from "~services/dexie-storage"

// Helper function to convert data URL to Blob (direct decoding approach)
function dataUrlToBlob(dataUrl: string): Blob {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.*)$/)
  if (!matches) {
    throw new Error('Invalid data URL format')
  }

  const mimeType = matches[1]
  const base64Data = matches[2]

  // Decode base64 string
  const byteCharacters = atob(base64Data)
  const byteArrays = []

  for (let i = 0; i < byteCharacters.length; i += 512) {
    const slice = byteCharacters.slice(i, i + 512)
    const byteNumbers = new Array(slice.length)
    for (let j = 0; j < slice.length; j++) {
      byteNumbers[j] = slice.charCodeAt(j)
    }
    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: mimeType })
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { dataUrl, width, height, url, title, timestamp } = req.body

    // Initialize Dexie if not already done
    await dexieStorageService.initialize()

    console.log("[Save annotation] handler - initialization")

    // Generate thumbnail for local storage (mobile-first)
    const thumbnailUrl = await generateThumbnail(dataUrl)
    console.log("[Save annotation] handler - thumbnail generated: ", thumbnailUrl || "no thumbnail")

    // Convert dataUrl to Blob for ImageKit upload (fixed direct decoding)
    const blob = dataUrlToBlob(dataUrl)
    const file = new File([blob], `annotation-${Date.now()}.png`, {
      type: 'image/png'
    })

    console.log("[Save annotation] handler - file created: ", file)
    console.log("[Save annotation] handler - file size: ", blob.size, "bytes")

    // Upload to ImageKit with retries
    let imageKitResult
    try {
      // imageKitResult = await imageKitService.uploadImage(dataUrl.replace("data:image/png;base64,", ""), file.name)
      imageKitResult = await imageKitService.uploadImage(file, file.name)
    } catch (error) {
      console.error('ImageKit upload failed:', error)
      // Continue without cloud storage if upload fails
    }

    // Check if user is authenticated and save to Convex
    let convexId: string | null = null
    if (await isUserAuthenticated() && imageKitResult?.url) {
      try {
        const userId = await getCurrentConvexUserId()
        if (userId) {
          convexId = await convexStorageService.saveAnnotation(userId, {
            dataUrl: imageKitResult.url, // Use ImageKit URL only (requirement)
            thumbnailUrl: imageKitResult.thumbnailUrl || thumbnailUrl,
            fileSize: imageKitResult?.fileSize || blob.size,
            width: width || 0,
            height: height || 0,
            timestamp: timestamp || Date.now(),
            url: url || '',
            title: title || `Annotation ${new Date().toLocaleString()}`,
            tags: [], // Default empty tags for now
            description: '',
            mimeType: 'image/png',
            imageKitFileId: imageKitResult?.fileId,
            imageKitUrl: imageKitResult?.url,
            imageKitThumbnailUrl: imageKitResult?.thumbnailUrl,
            isUploaded: !!imageKitResult
          })
          console.log("[Save annotation] Convex save successful:", convexId)
        }
      } catch (error) {
        console.error("[Save annotation] Failed to save to Convex:", error)
        // Continue with local storage even if Convex fails
      }
    }

    // Save the annotation to Dexie with Convex reference
    const annotationData: Omit<StoredAnnotationWithConvex, 'id' | 'createdAt' | 'updatedAt'> = {
      dataUrl: imageKitResult?.url || dataUrl,
      thumbnailUrl: imageKitResult?.thumbnailUrl || thumbnailUrl,
      fileSize: imageKitResult?.fileSize || blob.size,
      width: width || 0,
      height: height || 0,
      timestamp: timestamp || Date.now(),
      url: url || '',
      title: title || `Annotation ${new Date().toLocaleString()}`,
      tags: [], // Default empty tags for now
      description: '',
      mimeType: 'image/png',
      imageKitFileId: imageKitResult?.fileId,
      imageKitUrl: imageKitResult?.url,
      imageKitThumbnailUrl: imageKitResult?.thumbnailUrl,
      isUploaded: !!imageKitResult,
      convexId: convexId || undefined // Add Convex reference
    }

    const annotationId = await dexieStorageService.saveAnnotation(annotationData)

    console.log("[Save annotation] handler", {
      annotationId,
      imageKitResult
    })

    // Also save metadata to existing storage for backward compatibility
    await storageService.saveLastCaptureMetadata({
      width: width || 0,
      height: height || 0,
      timestamp: timestamp || Date.now(),
      url: url || '',
      title: title || ''
    })

    console.log('Annotation saved successfully with ID:', annotationId)

    res.send({
      type: 'ANNOTATION_SAVED',
      data: {
        id: annotationId,
        convexId: convexId,
        message: 'Annotation saved successfully',
        imageKitUploaded: !!imageKitResult,
        convexSaved: !!convexId
      }
    })
  } catch (error) {
    console.error('Failed to save annotation:', error)
    res.send({
      type: 'CAPTURE_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

export default handler
