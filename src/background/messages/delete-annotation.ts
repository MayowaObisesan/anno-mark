import type { PlasmoMessaging } from "@plasmohq/messaging"
import { dexieStorageService } from "~services/dexie-storage"
import { ConvexStorageService, convexStorageService } from "~services/convex-storage"
import type { StoredAnnotationWithConvex } from "~services/dexie-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    // Initialize Dexie if not already done
    await dexieStorageService.initialize()

    const { id } = req.body

    if (!id) {
      throw new Error('Annotation ID is required for deletion')
    }

    // Get annotation to check for Convex ID
    const annotation = await dexieStorageService.getAnnotation(id)
    if (!annotation) {
      throw new Error('Annotation not found')
    }

    // Delete from local storage
    await dexieStorageService.deleteAnnotation(id)

    // Delete from Convex if convexId exists
    let convexDeleted = false
    const convexId = ConvexStorageService.extractConvexId(annotation)
    if (convexId) {
      try {
        convexDeleted = await convexStorageService.deleteAnnotation(convexId)
        if (convexDeleted) {
          console.log('Annotation also deleted from Convex:', convexId)
        }
      } catch (error) {
        console.error('Failed to delete from Convex:', error)
        // Continue with local deletion only
      }
    }

    console.log('Annotation deleted successfully:', id, { convexDeleted })

    res.send({
      type: 'ANNOTATION_DELETED',
      data: {
        id,
        convexId,
        convexDeleted,
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
