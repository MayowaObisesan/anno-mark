import type { PlasmoMessaging } from "@plasmohq/messaging"
import { dexieStorageService } from "~services/dexie-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    // Initialize Dexie if not already done
    await dexieStorageService.initialize()
    
    const { type, limit, offset, sortBy, sortOrder, query } = req.body
    
    let annotations
    
    switch (type) {
      case 'recent':
        annotations = await dexieStorageService.getRecentAnnotations(limit || 10)
        break
        
      case 'all':
        annotations = await dexieStorageService.getAllAnnotations({
          limit,
          offset,
          sortBy: sortBy || 'createdAt',
          sortOrder: sortOrder || 'desc'
        })
        break
        
      case 'search':
        annotations = await dexieStorageService.searchAnnotations(query || {})
        break
        
      case 'byTag':
        const { tag } = req.body
        if (!tag) {
          throw new Error('Tag parameter is required for byTag query')
        }
        annotations = await dexieStorageService.getAnnotationsByTag(tag)
        break
        
      case 'single':
        const { id } = req.body
        if (!id) {
          throw new Error('ID parameter is required for single query')
        }
        const annotation = await dexieStorageService.getAnnotation(id)
        annotations = annotation ? [annotation] : []
        break
        
      default:
        annotations = await dexieStorageService.getRecentAnnotations(10)
    }
    
    // Get storage info
    const storageInfo = await dexieStorageService.getStorageInfo()
    
    res.send({ 
      type: 'ANNOTATIONS_RETRIEVED',
      data: { 
        annotations,
        storageInfo,
        count: annotations.length
      }
    })
  } catch (error) {
    console.error('Failed to get annotations:', error)
    res.send({
      type: 'RETRIEVAL_ERROR',
      data: { error: error instanceof Error ? error.message : 'Unknown error' }
    })
  }
}

export default handler
