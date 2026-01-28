# IndexedDB Implementation Plan for Anno-Mark

## Overview

This document outlines the implementation of IndexedDB-based storage for annotation exports in Anno-Mark. The goal is to provide a robust, scalable solution for storing and retrieving annotated images that overcomes the limitations of browser extension storage.

## Current Problem

- The `exportImage` function works but exported images from the browser extension are lost
- `save-annotation.ts` background handler receives `dataUrl` but only saves metadata
- No way for users to access previously exported annotations from the extension
- Browser extension storage has quota limitations for large image data

## Solution

Implement IndexedDB to store annotation exports with:
- Large storage capacity suitable for image data
- Efficient querying and retrieval
- Support for complex data structures
- Browser-wide persistence

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create IndexedDB service layer
- [ ] Define annotation storage schema
- [ ] Fix background handler to save actual image data
- [ ] Update storage service integration
- [ ] Test basic save/retrieve functionality

### Phase 2: Gallery Component
- [ ] Create AnnotationGallery component
- [ ] Implement basic view of saved annotations
- [ ] Add download functionality for individual annotations
- [ ] Add delete functionality
- [ ] Implement pagination for large collections

### Phase 3: Enhanced Features
- [ ] Add search and filter functionality
- [ ] Implement tag system for organization
- [ ] Add thumbnail generation for performance
- [ ] Implement batch operations (delete multiple, download as ZIP)
- [ ] Add sorting options (date, name, size)

### Phase 4: UI Integration
- [ ] Add gallery access to popup menu
- [ ] Create full gallery interface in options page
- [ ] Add toolbar integration for quick access
- [ ] Implement keyboard shortcuts for gallery navigation

### Phase 5: Advanced Features
- [ ] Add backup/restore functionality
- [ ] Implement annotation sharing capabilities
- [ ] Add import from other sources
- [ ] Create export analytics and usage statistics
- [ ] Add annotation history and versioning

## Technical Implementation Details

### Database Schema

```typescript
// Primary annotation store
interface StoredAnnotation {
  id: string                    // Primary key
  dataUrl: string               // Base64 image data
  width: number
  height: number
  timestamp: number
  url: string                   // Source page URL
  title: string                 // Page title
  tags: string[]                // User-defined tags
  description?: string          // User notes
  createdAt: Date
  updatedAt: Date
  fileSize: number              // Size in bytes
  mimeType: string              // Usually "image/png"
}

// Tag management store
interface Tag {
  id: string                    // Primary key
  name: string                  // Tag name
  color: string                 // Display color
  count: number                 // Number of annotations with this tag
  createdAt: Date
}

// Settings store (for database-specific settings)
interface DatabaseSettings {
  version: number               // Database version
  defaultTags: string[]         // Default tags for new annotations
  autoCleanup: boolean          // Auto-cleanup old annotations
  maxAnnotations: number        // Maximum annotations to store
  compressionEnabled: boolean   // Enable data compression
}
```

### File Structure

```
src/
├── services/
│   ├── indexeddb-storage.ts      # IndexedDB service layer
│   └── storage.ts               # Updated with IndexedDB integration
├── types/
│   └── annotations.ts           # Updated annotation types
├── components/
│   ├── AnnotationGallery.tsx     # Main gallery component
│   ├── AnnotationCard.tsx        # Individual annotation card
│   ├── AnnotationViewer.tsx      # Full-screen annotation viewer
│   └── TagManager.tsx           # Tag management component
├── background/
│   └── messages/
│       ├── save-annotation.ts    # Updated to save to IndexedDB
│       └── get-annotations.ts    # New message handler
├── tabs/
│   ├── gallery.tsx              # Full gallery page
│   └── editor.tsx               # Updated with gallery integration
├── contents/
│   └── plasmo-overlay.tsx       # Updated with new save functionality
└── options.tsx                  # Updated with gallery settings
```

### Core Service API

```typescript
class IndexedDBStorageService {
  // Database management
  async initialize(): Promise<void>
  async clear(): Promise<void>
  async getStorageInfo(): Promise<StorageInfo>
  
  // Annotation operations
  async saveAnnotation(annotation: StoredAnnotation): Promise<string>
  async getAnnotation(id: string): Promise<StoredAnnotation | null>
  async getAllAnnotations(options?: QueryOptions): Promise<StoredAnnotation[]>
  async updateAnnotation(id: string, updates: Partial<StoredAnnotation>): Promise<void>
  async deleteAnnotation(id: string): Promise<void>
  async deleteAnnotations(ids: string[]): Promise<void>
  
  // Search and filter
  async searchAnnotations(query: SearchQuery): Promise<StoredAnnotation[]>
  async getAnnotationsByTag(tag: string): Promise<StoredAnnotation[]>
  async getRecentAnnotations(limit: number): Promise<StoredAnnotation[]>
  
  // Tag operations
  async getAllTags(): Promise<Tag[]>
  async createTag(tag: Omit<Tag, 'id' | 'createdAt' | 'count'>): Promise<string>
  async updateTag(id: string, updates: Partial<Tag>): Promise<void>
  async deleteTag(id: string): Promise<void>
  
  // Bulk operations
  async exportAnnotations(): Promise<ExportData>
  async importAnnotations(data: ExportData): Promise<void>
  async createBackup(): Promise<Blob>
  async restoreFromBackup(backup: Blob): Promise<void>
}
```

### Performance Optimizations

1. **Lazy Loading**: Only load image data when needed
2. **Thumbnail Generation**: Create smaller previews for gallery view
3. **Virtual Scrolling**: Handle large collections efficiently
4. **Indexing**: Proper database indexes for common queries
5. **Compression**: Optional compression for image data
6. **Pagination**: Load annotations in chunks
7. **Caching**: Cache frequently accessed data in memory

### Error Handling

1. **Quota Management**: Monitor storage usage and handle quota exceeded
2. **Database Corruption**: Implement recovery mechanisms
3. **Migration Handling**: Smooth upgrades between database versions
4. **Fallback Strategies**: Graceful degradation if IndexedDB fails
5. **Data Validation**: Ensure data integrity on save/load

### Integration Points

1. **Background Scripts**: Message handlers for save/retrieve operations
2. **Content Scripts**: Integration with annotation editor
3. **Popup Menu**: Quick access to recent annotations
4. **Options Page**: Full gallery management interface
5. **Toolbar**: Floating button for quick annotation access

## Progress Tracking

### Phase 1: Core Infrastructure - [x] Completed
- [x] Create `src/services/indexeddb-storage.ts`
- [x] Define TypeScript interfaces for storage types
- [x] Implement database initialization and schema
- [x] Update `src/background/messages/save-annotation.ts`
- [x] Create `src/background/messages/get-annotations.ts`
- [x] Create `src/background/messages/delete-annotation.ts`
- [ ] Integrate with existing `src/services/storage.ts`
- [x] Add error handling and validation
- [ ] Write unit tests for core functionality

### Phase 2: Gallery Component - [x] Completed
- [x] Create `src/components/AnnotationGallery.tsx`
- [x] Implement basic list/grid view
- [x] Add download functionality
- [x] Add delete functionality with confirmation
- [x] Add search functionality
- [x] Add loading states and error handling
- [ ] Create `src/components/AnnotationCard.tsx` (optional, integrated into main component)
- [ ] Implement pagination (basic version implemented)

### Phase 3: Enhanced Features - [ ] Not Started
- [ ] Implement search functionality
- [ ] Add filter by date, tags, size
- [ ] Create `src/components/TagManager.tsx`
- [ ] Implement thumbnail generation
- [ ] Add batch operations
- [ ] Create ZIP export functionality
- [ ] Add sorting options

### Phase 4: UI Integration - [ ] Not Started
- [ ] Update `src/popup.tsx` with gallery link
- [ ] Update `src/options.tsx` with full gallery
- [ ] Add gallery access to `src/tabs/gallery.tsx`
- [ ] Implement keyboard shortcuts
- [ ] Add responsive design for mobile
- [ ] Update `src/contents/plasmo-overlay.tsx` with new save flow

### Phase 5: Advanced Features - [ ] Not Started
- [ ] Implement backup/restore system
- [ ] Add sharing functionality (copy link, social)
- [ ] Create import from file feature
- [ ] Add usage analytics
- [ ] Implement annotation versioning
- [ ] Add data export to other formats

## Testing Strategy

1. **Unit Tests**: Test all IndexedDB operations
2. **Integration Tests**: Test background handlers and UI integration
3. **Performance Tests**: Test with large annotation collections
4. **Browser Compatibility**: Test across different browsers
5. **Storage Limits**: Test behavior with storage quota limits
6. **Migration Tests**: Test database schema upgrades

## Deployment Considerations

1. **Gradual Rollout**: Phase 1 first, then incremental additions
2. **Backward Compatibility**: Ensure existing functionality isn't broken
3. **Feature Flags**: Allow enabling/disabling new features
4. **Migration Path**: Smooth transition from current system
5. **Fallback Options**: Graceful degradation if IndexedDB fails

## Success Metrics

1. **Storage Reliability**: 100% save/retrieve success rate
2. **Performance**: Gallery loads within 2 seconds with 1000+ annotations
3. **User Experience**: Intuitive gallery navigation and management
4. **Storage Efficiency**: Effective use of available storage quota
5. **Feature Adoption**: Regular usage of gallery and management features

---

**Last Updated**: January 23, 2026
**Status**: Phase 1 & 2 Completed
**Next Milestone**: Phase 3 - Enhanced Features
