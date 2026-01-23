import type { PlasmoMessaging } from "@plasmohq/messaging"
import { storageService } from "~services/storage"
import { dexieStorageService } from "~services/dexie-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { dataUrl, width, height, url, title, timestamp } = req.body

    // Initialize Dexie if not already done
    await dexieStorageService.initialize()

    // Save the full annotation to Dexie
    const annotationId = await dexieStorageService.saveAnnotation({
      dataUrl,
      fileSize: 0,
      width: width || 0,
      height: height || 0,
      timestamp: timestamp || Date.now(),
      url: url || '',
      title: title || `Annotation ${new Date().toLocaleString()}`,
      tags: [], // Default empty tags for now
      description: '',
      mimeType: 'image/png'
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
        message: 'Annotation saved successfully'
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
