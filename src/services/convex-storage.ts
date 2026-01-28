import { convex, initializeAuthenticatedConvex } from "./convex-auth";
import type { StoredAnnotation } from "./indexeddb-storage";
import type { StoredAnnotationWithConvex } from "./dexie-storage";
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"

// Extended interface for Convex annotations
export interface ConvexAnnotation {
  _id: string;
  userId: string;
  imageKitUrl: string;
  thumbnailUrl?: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  fileSize: number;
  timestamp: number;
  url?: string;
  tags?: string[];
  imageKitFileId?: string;
  createdAt: number;
}

export interface ConvexUser {
  _id: string;
  clerkId: string;
  email?: string;
  name?: string;
  imageUrl?: string;
  createdAt: number;
}

export class ConvexStorageService {
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Save annotation to Convex for authenticated user
   */
  async saveAnnotation(
    userId: string,
    annotation: Omit<StoredAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot save to Convex: Not authenticated");
        return null;
      }

      // Validate that we have an ImageKit URL (requirement: only store URLs in Convex)
      if (!annotation.imageKitUrl) {
        console.warn("Cannot save to Convex: no ImageKit URL provided");
        return null;
      }

      const convexId = await this.withRetry(async () => {
        return await convex.mutation(api.annotations.saveUserAnnotation, {
          userId: userId as Id<"users">,
          imageKitUrl: annotation.imageKitUrl,
          thumbnailUrl: annotation.thumbnailUrl,
          title: annotation.title,
          description: annotation.description,
          width: annotation.width,
          height: annotation.height,
          fileSize: annotation.fileSize,
          timestamp: annotation.timestamp,
          url: annotation.url,
          tags: annotation.tags || [],
          imageKitFileId: annotation.imageKitFileId,
        });
      });

      console.log("Annotation saved to Convex successfully:", convexId);
      return convexId;
    } catch (error) {
      console.error("Failed to save annotation to Convex:", error);
      return null;
    }
  }

  /**
   * Get all annotations for a user from Convex
   */
  async getUserAnnotations(userId: string): Promise<ConvexAnnotation[]> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot get annotations from Convex: Not authenticated");
        return [];
      }

      const annotations = await this.withRetry(async () => {
        return await convex.query(api.annotations.getUserAnnotations, {
          userId: userId as Id<"users">,
        });
      });

      console.log(`Retrieved ${annotations.length} annotations from Convex for user ${userId}`);
      return annotations;
    } catch (error) {
      console.error("Failed to get annotations from Convex:", error);
      return [];
    }
  }

  /**
   * Get paginated annotations for a user
   */
  async getUserAnnotationsPaginated(
    userId: string,
    limit: number = 20,
    cursor?: string
  ): Promise<{ page: ConvexAnnotation[]; isDone: boolean; continueCursor?: string }> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot get paginated annotations from Convex: Not authenticated");
        return { page: [], isDone: true };
      }

      const result = await this.withRetry(async () => {
        return await convex.query(api.annotations.getUserAnnotationsPaginated, {
          userId: userId as Id<"users">,
          paginationOpts: {
            limit,
            cursor,
          },
        });
      });

      // Handle the result properly - it might be directly the paginated result or an array
      if (Array.isArray(result)) {
        // If it's an array, convert it to the expected format
        return {
          page: result as ConvexAnnotation[],
          isDone: true,
          continueCursor: undefined
        };
      }

      // If it's already in the correct format, return as-is
      return result as { page: ConvexAnnotation[]; isDone: boolean; continueCursor?: string };
    } catch (error) {
      console.error("Failed to get paginated annotations from Convex:", error);
      return { page: [], isDone: true };
    }
  }

  /**
   * Get a single annotation by ID
   */
  async getAnnotationById(annotationId: string): Promise<ConvexAnnotation | null> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot get annotation from Convex: Not authenticated");
        return null;
      }

      const annotation = await this.withRetry(async () => {
        return await convex.query(api.annotations.getAnnotationById, {
          annotationId: annotationId as any, // Type assertion for Convex ID
        });
      });

      return annotation || null;
    } catch (error) {
      console.error("Failed to get annotation from Convex:", error);
      return null;
    }
  }

  /**
   * Delete annotation from Convex
   */
  async deleteAnnotation(convexId: string): Promise<boolean> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot delete annotation from Convex: Not authenticated");
        return false;
      }

      await this.withRetry(async () => {
        return await convex.mutation(api.annotations.deleteUserAnnotation, {
          annotationId: convexId as any, // Type assertion for Convex ID
        });
      });

      console.log("Annotation deleted from Convex successfully:", convexId);
      return true;
    } catch (error) {
      console.error("Failed to delete annotation from Convex:", error);
      return false;
    }
  }

  /**
   * Update annotation metadata in Convex
   */
  async updateAnnotation(
    convexId: string,
    updates: { title?: string; description?: string; tags?: string[] }
  ): Promise<boolean> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot update annotation in Convex: Not authenticated");
        return false;
      }

      await this.withRetry(async () => {
        return await convex.mutation(api.annotations.updateUserAnnotation, {
          annotationId: convexId as any, // Type assertion for Convex ID
          updates,
        });
      });

      console.log("Annotation updated in Convex successfully:", convexId);
      return true;
    } catch (error) {
      console.error("Failed to update annotation in Convex:", error);
      return false;
    }
  }

  /**
   * Search annotations for a user
   */
  async searchUserAnnotations(
    userId: string,
    searchText?: string,
    tags?: string[]
  ): Promise<ConvexAnnotation[]> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot search annotations from Convex: Not authenticated");
        return [];
      }

      const annotations = await this.withRetry(async () => {
        return await convex.query(api.annotations.searchUserAnnotations, {
          userId: userId as Id<"users">,
          searchText,
          tags,
        });
      });

      console.log(`Found ${annotations.length} matching annotations in Convex for user ${userId}`);
      return annotations;
    } catch (error) {
      console.error("Failed to search annotations from Convex:", error);
      return [];
    }
  }

  /**
   * Get user information
   */
  async getUserByClerkId(clerkId: string): Promise<ConvexUser | null> {
    try {
      // Ensure Convex client is authenticated before making any calls
      const isAuthenticated = await initializeAuthenticatedConvex();
      if (!isAuthenticated) {
        console.warn("Cannot get user from Convex: Not authenticated");
        return null;
      }

      const user = await this.withRetry(async () => {
        return await convex.query(api.users.getUserByClerkId, {
          clerkId,
        });
      });

      return user || null;
    } catch (error) {
      console.error("Failed to get user from Convex:", error);
      return null;
    }
  }

  /**
   * Test connection to Convex
   */
  async testConnection(): Promise<boolean> {
    try {
      // For connection test, we don't need authentication
      // This just tests if the Convex endpoint is reachable
      await convex.query(api.users.getUserByClerkId, {
        clerkId: "test-connection",
      });
      return true;
    } catch (error) {
      console.error("Convex connection test failed:", error);
      return false;
    }
  }

  /**
   * Retry mechanism for Convex operations
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    attempts: number = this.retryAttempts
  ): Promise<T> {
    let lastError: Error;

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (i === attempts - 1) {
          throw lastError;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, i);
        console.warn(`Convex operation failed, retrying in ${delay}ms (attempt ${i + 1}/${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Convert Convex annotation to local storage format
   */
  static convexToStoredAnnotation(convexAnnotation: ConvexAnnotation): StoredAnnotationWithConvex {
    return {
      id: `convex_${convexAnnotation._id}`, // Prefix to identify Convex annotations
      dataUrl: convexAnnotation.imageKitUrl,
      thumbnailUrl: convexAnnotation.thumbnailUrl,
      width: convexAnnotation.width,
      height: convexAnnotation.height,
      fileSize: convexAnnotation.fileSize,
      timestamp: convexAnnotation.timestamp,
      url: convexAnnotation.url || '',
      title: convexAnnotation.title,
      tags: convexAnnotation.tags || [],
      description: convexAnnotation.description,
      mimeType: 'image/png',
      imageKitFileId: convexAnnotation.imageKitFileId,
      imageKitUrl: convexAnnotation.imageKitUrl,
      imageKitThumbnailUrl: convexAnnotation.thumbnailUrl,
      isUploaded: true,
      convexId: convexAnnotation._id,
      createdAt: new Date(convexAnnotation.createdAt),
      updatedAt: new Date(convexAnnotation.createdAt),
    };
  }

  /**
   * Check if annotation is from Convex
   */
  static isConvexAnnotation(annotation: StoredAnnotation | StoredAnnotationWithConvex): boolean {
    return annotation.id.startsWith('convex_') || !!(annotation as StoredAnnotationWithConvex).convexId;
  }

  /**
   * Extract Convex ID from annotation ID
   */
  static extractConvexId(annotation: StoredAnnotation | StoredAnnotationWithConvex): string | null {
    const convexAnnotation = annotation as StoredAnnotationWithConvex;
    if (convexAnnotation.convexId) {
      return convexAnnotation.convexId;
    }

    if (annotation.id.startsWith('convex_')) {
      return annotation.id.replace('convex_', '');
    }

    return null;
  }
}

// Export singleton instance
export const convexStorageService = new ConvexStorageService();
