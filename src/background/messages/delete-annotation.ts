import type { PlasmoMessaging } from "@plasmohq/messaging"
import { dexieStorageService } from "~services/dexie-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    // Initialize Dexie if not already done
    await dexieStorageService.initialize()
    
    const { id } = req.body
    
    if (!id) {
      throw new Error('Annotation ID is required for deletion')
    }
    
    await dexieStorageService.deleteAnnotation(id)
    
    console.log('Annotation deleted successfully:', id)
    
    res.send({ 
      type: 'ANNOTATION_DELETED',
      data: { 
        id,
        message: 'Annotation deleted successfully'
      }
    })
  } catch (error) {
    console.error('Failed to delete annotation:', error)
    res.send({
      type: 'DELETION_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

export default handler
