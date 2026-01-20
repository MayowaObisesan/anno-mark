import type { PlasmoMessaging } from "@plasmohq/messaging"
import { storageService } from "~services/storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { dataUrl } = req.body
    await storageService.saveLastCaptureMetadata({
      width: 0, // Will be determined from image
      height: 0, // Will be determined from image
      timestamp: Date.now(),
      url: '',
      title: ''
    })
    res.send({ type: 'ANNOTATION_SAVED' })
  } catch (error) {
    console.error('Failed to save annotation:', error)
    res.send({
      type: 'CAPTURE_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

export default handler
