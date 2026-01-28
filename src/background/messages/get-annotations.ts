import type { PlasmoMessaging } from "@plasmohq/messaging"
import { dexieStorageService } from "~services/dexie-storage"
import { isUserAuthenticated, getCurrentConvexUserId } from "~services/convex-auth"
import { convexStorageService, ConvexStorageService } from "~services/convex-storage"
import type { StoredAnnotationWithConvex } from "~services/dexie-storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    // Initialize Dexie if not already done
    await dexieStorageService.initialize()

    const { type, limit, offset, sortBy, sortOrder, query } = req.body

    let annotations: StoredAnnotationWithConvex[] = []
    let convexAnnotations: any[] = []

    // Get local annotations first
    let localAnnotations: StoredAnnotationWithConvex[] = []

    switch (type) {
      case 'recent':
        localAnnotations = await dexieStorageService.getRecentAnnotations(limit || 10)
        break

      case 'all':
        localAnnotations = await dexieStorageService.getAllAnnotations({
          limit,
          offset,
          sortBy: sortBy || 'createdAt',
          sortOrder: sortOrder || 'desc'
        })
        break

      case 'search':
        localAnnotations = await dexieStorageService.searchAnnotations(query || {})
        break

      case 'byTag':
        const { tag } = req.body
        if (!tag) {
          throw new Error('Tag parameter is required for byTag query')
        }
        localAnnotations = await dexieStorageService.getAnnotationsByTag(tag)
        break

      case 'single':
        const { id } = req.body
        if (!id) {
          throw new Error('ID parameter is required for single query')
        }
        const annotation = await dexieStorageService.getAnnotation(id)
        localAnnotations = annotation ? [annotation] : []
        break

      default:
        localAnnotations = await dexieStorageService.getRecentAnnotations(10)
    }

    // If user is authenticated, fetch from Convex
    if (await isUserAuthenticated()) {
      try {
        const userId = await getCurrentConvexUserId()
        if (userId) {
          convexAnnotations = await convexStorageService.getUserAnnotations(userId)
        }
      } catch (error) {
        console.error("Failed to fetch Convex annotations:", error)
        // Continue with local annotations only
      }
    }

    // Merge local and Convex annotations
    annotations = mergeAnnotations(localAnnotations, convexAnnotations)

    // Get storage info
    const storageInfo = await dexieStorageService.getStorageInfo()

    res.send({
      type: 'ANNOTATIONS_RETRIEVED',
      data: {
        annotations,
        storageInfo,
        count: annotations.length,
        convexCount: convexAnnotations.length,
        localCount: localAnnotations.length
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

/**
 * Merge local and Convex annotations, avoiding duplicates
 * Prioritize Convex data for authenticated users
 */
function mergeAnnotations(
  localAnnotations: StoredAnnotationWithConvex[],
  convexAnnotations: any[]
): StoredAnnotationWithConvex[] {
  const mergedMap = new Map<string, StoredAnnotationWithConvex>()

  // First, add all Convex annotations (they have precedence)
  for (const convexAnn of convexAnnotations) {
    const storedAnn = ConvexStorageService.convexToStoredAnnotation(convexAnn)
    mergedMap.set(storedAnn.id, storedAnn)
  }

  // Then, add local annotations that don't exist in Convex
  for (const localAnn of localAnnotations) {
    const convexId = ConvexStorageService.extractConvexId(localAnn)

    // If annotation doesn't have convexId or convexId not in Convex results, add it
    if (!convexId || !mergedMap.has(`convex_${convexId}`)) {
      mergedMap.set(localAnn.id, localAnn)
    }
  }

  // Convert back to array and sort by timestamp (newest first)
  return Array.from(mergedMap.values())
    .sort((a, b) => b.timestamp - a.timestamp)
}

export default handler
