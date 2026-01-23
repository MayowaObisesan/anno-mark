import type { PlasmoMessaging } from "@plasmohq/messaging"
import { storageService } from "~services/storage"
import { dualStorageService } from "~services/dual-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { dataUrl, width, height, url, title, timestamp } = req.body

    // Initialize dual storage service
    await dualStorageService.initialize()

    // Save the annotation with dual storage support
    const annotationId = await dualStorageService.saveAnnotation({
      dataUrl,
      width: width || 0,
      height: height || 0,
      timestamp: timestamp || Date.now(),
      url: url || '',
      title: title || `Annotation ${new Date().toLocaleString()}`,
      tags: [], // Default empty tags for now
      description: '',
      mimeType: 'image/png',
      fileSize: 0 // Will be calculated in the service
    }, {
      generateThumbnail: true, // Generate thumbnail for mobile-first experience
      uploadToCloud: true, // Upload to cloud if credentials are available
      syncStatus: 'pending' // Start with pending sync status
    })

    // Also save metadata to existing storage for backward compatibility
    await storageService.saveLastCaptureMetadata({
      width: width || 0,
      height: height || 0,
      timestamp: timestamp || Date.now(),
      url: url || '',
      title: title || ''
    })

    console.log('Annotation saved successfully with dual storage:', annotationId)

    res.send({
      type: 'ANNOTATION_SAVED',
      data: {
        id: annotationId,
        message: 'Annotation saved successfully with cloud storage enabled'
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
