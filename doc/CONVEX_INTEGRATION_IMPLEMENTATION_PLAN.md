# Convex Integration Implementation Plan

## Overview

This document outlines the implementation plan for adding Convex storage to the Anno-Mark browser extension. The goal is to provide cloud storage for authenticated users while maintaining the existing local storage functionality.

## Current State Analysis

### Existing Architecture
- **Authentication**: Using Clerk (`@clerk/chrome-extension`) for user authentication
- **Image Storage**: ImageKit for uploading and storing images
- **Local Storage**: Dexie (IndexedDB wrapper) for local annotation storage
- **Save Flow**: `save-annotation.ts` saves to both ImageKit and local Dexie storage

### Requirements
1. **No Migration**: Do not migrate existing local annotations to Convex
2. **URLs Only**: Store only ImageKit URLs in Convex, not full image data
3. **Dual Storage**: Keep both local and cloud storage for all users
4. **User-Specific**: Only authenticated users get cloud storage

## Implementation Plan

### Phase 1: Project Setup & Dependencies

#### 1.1 Install Convex Dependencies
```bash
npm install convex @convex-dev/react
```

#### 1.2 Initialize Convex Project
```bash
npx convex dev
```

#### 1.3 Update Dependencies
- Add Convex packages to `package.json`
- Configure Convex for Chrome extension context

### Phase 2: Convex Database Schema

#### 2.1 Create Schema File (`convex/schema.ts`)
```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerk", ["clerkId"]),

  annotations: defineTable({
    userId: v.id("users"),
    imageKitUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    fileSize: v.number(),
    timestamp: v.number(),
    url: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageKitFileId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});
```

### Phase 3: Convex Functions

#### 3.1 User Management (`convex/users.ts`)
```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    const userId = await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });

    return userId;
  },
});
```

#### 3.2 Annotation Management (`convex/annotations.ts`)
```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveUserAnnotation = mutation({
  args: {
    userId: v.id("users"),
    imageKitUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    width: v.number(),
    height: v.number(),
    fileSize: v.number(),
    timestamp: v.number(),
    url: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageKitFileId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const annotationId = await ctx.db.insert("annotations", {
      ...args,
      createdAt: Date.now(),
    });

    return annotationId;
  },
});

export const getUserAnnotations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("annotations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const deleteUserAnnotation = mutation({
  args: { annotationId: v.id("annotations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.annotationId);
  },
});
```

### Phase 4: Authentication Integration

#### 4.1 Create Auth Utilities (`src/services/convex-auth.ts`)
```typescript
import { ConvexHttpClient } from "convex/browser";
import { useAuth } from "@clerk/chrome-extension";

const convexUrl = process.env.PLASMO_PUBLIC_CONVEX_URL!;
export const convex = new ConvexHttpClient(convexUrl);

export async function getCurrentUserId() {
  try {
    const { userId } = useAuth();
    if (!userId) return null;
    
    // Get or create user in Convex
    const user = await convex.mutation("users/createOrUpdateUser", {
      clerkId: userId,
      // Add user info from Clerk if needed
    });
    
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function isUserAuthenticated() {
  const { isSignedIn, userId } = useAuth();
  return isSignedIn && !!userId;
}
```

### Phase 5: Convex Service Layer

#### 5.1 Create Convex Storage Service (`src/services/convex-storage.ts`)
```typescript
import { convex } from "./convex-auth";
import type { StoredAnnotation } from "./indexeddb-storage";

export class ConvexStorageService {
  async saveAnnotation(
    userId: string, 
    annotation: Omit<StoredAnnotation, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string | null> {
    try {
      if (!annotation.imageKitUrl) {
        console.warn("Cannot save to Convex: no ImageKit URL");
        return null;
      }

      const convexId = await convex.mutation("annotations/saveUserAnnotation", {
        userId,
        imageKitUrl: annotation.imageKitUrl,
        thumbnailUrl: annotation.thumbnailUrl,
        title: annotation.title,
        description: annotation.description,
        width: annotation.width,
        height: annotation.height,
        fileSize: annotation.fileSize,
        timestamp: annotation.timestamp,
        url: annotation.url,
        tags: annotation.tags,
        imageKitFileId: annotation.imageKitFileId,
      });

      return convexId;
    } catch (error) {
      console.error("Failed to save annotation to Convex:", error);
      return null;
    }
  }

  async getUserAnnotations(userId: string) {
    try {
      return await convex.query("annotations/getUserAnnotations", {
        userId,
      });
    } catch (error) {
      console.error("Failed to get annotations from Convex:", error);
      return [];
    }
  }

  async deleteAnnotation(convexId: string) {
    try {
      await convex.mutation("annotations/deleteUserAnnotation", {
        annotationId: convexId,
      });
      return true;
    } catch (error) {
      console.error("Failed to delete annotation from Convex:", error);
      return false;
    }
  }
}

export const convexStorageService = new ConvexStorageService();
```

### Phase 6: Modify Save Annotation Flow

#### 6.1 Update `src/background/messages/save-annotation.ts`
```typescript
import { getCurrentUserId, isUserAuthenticated } from "~services/convex-auth";
import { convexStorageService } from "~services/convex-storage";

// In the handler function:
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    // ... existing code for local storage and ImageKit upload ...

    // Check if user is authenticated and save to Convex
    let convexId: string | null = null;
    if (await isUserAuthenticated()) {
      const userId = await getCurrentUserId();
      if (userId && imageKitResult?.url) {
        convexId = await convexStorageService.saveAnnotation(userId, {
          dataUrl: imageKitResult.url, // Use ImageKit URL
          thumbnailUrl: imageKitResult.thumbnailUrl || thumbnailUrl,
          fileSize: imageKitResult?.fileSize || blob.size,
          width: width || 0,
          height: height || 0,
          timestamp: timestamp || Date.now(),
          url: url || '',
          title: title || `Annotation ${new Date().toLocaleString()}`,
          tags: [],
          description: '',
          mimeType: 'image/png',
          imageKitFileId: imageKitResult?.fileId,
          imageKitUrl: imageKitResult?.url,
          imageKitThumbnailUrl: imageKitResult?.thumbnailUrl,
          isUploaded: !!imageKitResult
        });
      }
    }

    // Save to local storage with Convex reference
    const annotationId = await dexieStorageService.saveAnnotation({
      // ... existing fields ...
      convexId: convexId, // Add reference to Convex
    });

    res.send({
      type: 'ANNOTATION_SAVED',
      data: {
        id: annotationId,
        convexId,
        message: 'Annotation saved successfully',
        imageKitUploaded: !!imageKitResult,
        convexSaved: !!convexId
      }
    });
  } catch (error) {
    // ... existing error handling ...
  }
};
```

### Phase 7: Update Retrieve Annotation Flow

#### 7.1 Modify `src/background/messages/get-annotations.ts`
```typescript
import { getCurrentUserId, isUserAuthenticated } from "~services/convex-auth";
import { convexStorageService } from "~services/convex-storage";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const localAnnotations = await dexieStorageService.getAllAnnotations();
    
    // If user is authenticated, fetch Convex annotations
    let convexAnnotations: any[] = [];
    if (await isUserAuthenticated()) {
      const userId = await getCurrentUserId();
      if (userId) {
        convexAnnotations = await convexStorageService.getUserAnnotations(userId);
      }
    }

    // Merge annotations, avoiding duplicates
    const mergedAnnotations = mergeAnnotations(localAnnotations, convexAnnotations);

    res.send({
      type: 'ANNOTATIONS_RETRIEVED',
      data: {
        annotations: mergedAnnotations,
        count: mergedAnnotations.length,
        convexCount: convexAnnotations.length,
        localCount: localAnnotations.length
      }
    });
  } catch (error) {
    // ... error handling ...
  }
};

function mergeAnnotations(local: any[], convex: any[]) {
  // Implement merging logic to avoid duplicates
  // Prioritize Convex data for authenticated users
  // This function needs to handle the different data structures
}
```

### Phase 8: Update Delete Annotation Flow

#### 8.1 Modify `src/background/messages/delete-annotation.ts`
```typescript
import { convexStorageService } from "~services/convex-storage";

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const { id, convexId } = req.body;

    // Delete from local storage
    await dexieStorageService.deleteAnnotation(id);

    // Delete from Convex if convexId exists
    if (convexId) {
      await convexStorageService.deleteAnnotation(convexId);
    }

    res.send({
      type: 'ANNOTATION_DELETED',
      data: {
        id,
        convexId,
        message: 'Annotation deleted successfully'
      }
    });
  } catch (error) {
    // ... error handling ...
  }
};
```

### Phase 9: Update Gallery UI

#### 9.1 Modify `src/components/AnnotationGallery.tsx`
- Add loading states for Convex data
- Show cloud vs local storage indicators
- Handle authentication state changes
- Update delete functionality to handle Convex IDs

### Phase 10: Error Handling & Edge Cases

#### 10.1 Comprehensive Error Handling
- Convex connectivity issues
- Authentication state changes
- Network failures
- Data synchronization conflicts

#### 10.2 Offline Support
- Graceful degradation when Convex is unavailable
- Retry mechanisms for failed uploads
- Conflict resolution strategies

## Implementation Checklist

### Phase 1: Project Setup & Dependencies
- [ ] Install Convex dependencies (`convex`, `@convex-dev/react`)
- [ ] Initialize Convex project (`npx convex dev`)
- [ ] Update `package.json` with new dependencies
- [ ] Configure Convex environment variables

### Phase 2: Convex Database Schema
- [ ] Create `convex/schema.ts` with users and annotations tables
- [ ] Define proper indexes for efficient queries
- [ ] Test schema with `npx convex dev`

### Phase 3: Convex Functions
- [ ] Implement user management functions in `convex/users.ts`
- [ ] Implement annotation CRUD operations in `convex/annotations.ts`
- [ ] Test functions in Convex dashboard

### Phase 4: Authentication Integration
- [ ] Create `src/services/convex-auth.ts`
- [ ] Implement user authentication utilities
- [ ] Test authentication flow in extension context

### Phase 5: Convex Service Layer
- [ ] Create `src/services/convex-storage.ts`
- [ ] Implement Convex storage service methods
- [ ] Add error handling and retry logic

### Phase 6: Modify Save Annotation Flow
- [ ] Update `src/background/messages/save-annotation.ts`
- [ ] Add Convex save logic for authenticated users
- [ ] Test dual storage functionality

### Phase 7: Update Retrieve Annotation Flow
- [ ] Modify `src/background/messages/get-annotations.ts`
- [ ] Implement annotation merging logic
- [ ] Test data retrieval from both sources

### Phase 8: Update Delete Annotation Flow
- [ ] Modify `src/background/messages/delete-annotation.ts`
- [ ] Add Convex delete functionality
- [ ] Test dual deletion process

### Phase 9: Update Gallery UI
- [ ] Modify `src/components/AnnotationGallery.tsx`
- [ ] Add loading states and indicators
- [ ] Test UI with authenticated and anonymous users

### Phase 10: Error Handling & Edge Cases
- [ ] Implement comprehensive error handling
- [ ] Add offline support mechanisms
- [ ] Test edge cases and failure scenarios

### Phase 11: Testing & Validation
- [ ] Test complete flow for authenticated users
- [ ] Test complete flow for anonymous users
- [ ] Test authentication state changes
- [ ] Test offline behavior
- [ ] Performance testing
- [ ] Security validation

## Files to Create/Modify

### New Files
- `convex/schema.ts`
- `convex/users.ts`
- `convex/annotations.ts`
- `src/services/convex-auth.ts`
- `src/services/convex-storage.ts`

### Modified Files
- `package.json`
- `src/background/messages/save-annotation.ts`
- `src/background/messages/get-annotations.ts`
- `src/background/messages/delete-annotation.ts`
- `src/components/AnnotationGallery.tsx`
- `src/types/annotations.ts` (may need updates for convexId field)

## Technical Considerations

### Extension Context Challenges
- Convex client initialization in different extension contexts
- Authentication state sharing between popup, background, and content scripts
- Cross-context communication for Convex operations

### Data Synchronization
- Conflict resolution between local and cloud storage
- Handling network connectivity issues
- Optimistic updates and rollback mechanisms

### Security & Privacy
- Proper authentication token handling
- Data access controls
- Privacy considerations for user data

## Success Criteria

1. ✅ Authenticated users' annotations are saved to Convex
2. ✅ Anonymous users continue to use local storage only
3. ✅ Existing local annotations are not migrated
4. ✅ Only ImageKit URLs are stored in Convex
5. ✅ Dual storage works seamlessly
6. ✅ Offline functionality is preserved
7. ✅ Performance impact is minimal
8. ✅ Error handling is robust

## Rollback Plan

If issues arise during implementation:
1. Remove Convex dependencies from `package.json`
2. Revert changes to background message handlers
3. Remove new service files
4. Update UI to remove Convex-specific features
5. Ensure local storage continues to work independently

---

**Current Progress: 0/11 items completed (0%)**

- [ ] Install Convex dependencies and initialize project
- [ ] Create Convex schema for users and annotations  
- [ ] Implement Convex functions for user and annotation CRUD operations
- [ ] Create authentication integration utilities
- [ ] Build Convex service layer for storage operations
- [ ] Modify save annotation flow to use Convex for authenticated users
- [ ] Update retrieve annotation flow to fetch from Convex
- [ ] Update delete annotation flow for dual storage
- [ ] Update gallery UI to handle Convex data
- [ ] Add comprehensive error handling and edge cases
- [ ] Test the complete implementation
