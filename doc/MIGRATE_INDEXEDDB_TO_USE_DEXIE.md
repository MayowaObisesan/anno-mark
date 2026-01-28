# Migration Plan: Native IndexedDB to Dexie.js

## Overview

This document outlines the migration from native IndexedDB API to Dexie.js for the Anno-Mark annotation storage system. The goal is to leverage Dexie's cleaner API, better TypeScript support, and enhanced features while maintaining backward compatibility.

## Why Migrate to Dexie.js?

### Benefits Over Native IndexedDB
1. **Simpler API**: Reduces boilerplate code by ~70%
2. **Better TypeScript Support**: First-class TypeScript integration with stronger type safety
3. **Advanced Querying**: Powerful where clauses and complex filtering
4. **Performance Optimizations**: Optimized bulk operations and transactions
5. **Cross-browser Compatibility**: Handles browser differences automatically
6. **Better Error Handling**: Improved debugging and error management
7. **Relationship Support**: Native support for table relationships
8. **Future-Proof**: Easier to extend and maintain

### Code Comparison Examples

#### Current Native IndexedDB (Complex)
```typescript
// Get recent annotations
const request = store.index('createdAt').openCursor(null, 'prev')
const annotations = []
request.onsuccess = (event) => {
  const cursor = event.target.result
  if (cursor) {
    annotations.push(cursor.value)
    cursor.continue()
  }
}

// Search annotations
const searchRequest = store.openCursor()
searchRequest.onsuccess = (event) => {
  const cursor = event.target.result
  while (cursor) {
    if (matchesFilter(cursor.value)) {
      annotations.push(cursor.value)
    }
    cursor.continue()
  }
}
```

#### With Dexie.js (Clean)
```typescript
// Get recent annotations
const annotations = await db.annotations
  .orderBy('createdAt')
  .reverse()
  .limit(50)
  .toArray()

// Search annotations
const annotations = await db.annotations
  .where('title')
  .startsWith(searchTerm)
  .or('description')
  .startsWith(searchTerm)
  .or('tags')
  .anyOf(searchTags)
  .toArray()
```

## Implementation Phases

### Phase 1: Database Schema Migration
- [ ] Install and configure Dexie.js
- [ ] Create Dexie database schema with versioning
- [ ] Define table relationships (annotations ↔ tags)
- [ ] Set up proper indexes for performance optimization
- [ ] Implement migration strategy from existing IndexedDB

### Phase 2: Core Service Rewrite
- [ ] Replace IndexedDB initialization with Dexie setup
- [ ] Convert all CRUD operations to Dexie syntax
- [ ] Implement advanced queries using Dexie's where clauses
- [ ] Add bulk operations for better performance
- [ ] Update error handling to use Dexie patterns

### Phase 3: Enhanced Features Implementation
- [ ] Implement annotation-tag many-to-many relationships
- [ ] Add complex search with multiple filters
- [ ] Implement transactions for data integrity
- [ ] Add database migration support for future schema changes
- [ ] Implement reactive queries and real-time updates

### Phase 4: Integration Updates
- [ ] Update all background message handlers to use new Dexie service
- [ ] Ensure compatibility with existing AnnotationGallery component
- [ ] Test integration with annotation editor components
- [ ] Update error handling throughout the application

### Phase 5: Testing & Optimization
- [ ] Create migration testing from current IndexedDB database
- [ ] Performance benchmarking vs current implementation
- [ ] Cross-browser compatibility testing
- [ ] Error handling validation and edge case testing
- [ ] Load testing with large annotation datasets

## Technical Implementation Details

### New Database Schema with Dexie

```typescript
import Dexie, { Table } from 'dexie'

// Database version 2 (migrating from version 1)
const db = new Dexie('AnnoMarkDB') as {
  annotations: Table<StoredAnnotation, string>
  tags: Table<Tag, string>
  annotationTags: Table<AnnotationTag, number>
}

// Define schema
db.version(1).stores({
  annotations: '++id, dataUrl, width, height, timestamp, url, title, tags, description, createdAt, updatedAt, fileSize, mimeType',
  tags: '++id, name, color, count, createdAt',
  annotationTags: '++id, annotationId, tagId'
})

// Version 2 with relationships
db.version(2).stores({
  annotations: '++id, dataUrl, width, height, timestamp, url, title, *tags, description, createdAt, updatedAt, fileSize, mimeType',
  tags: '++id, name, color, count, createdAt',
  annotationTags: '++id, annotationId -> annotationId, tagId -> tagId'
})
```

### Enhanced Service API

```typescript
class DexieStorageService {
  private db: Dexie

  async initialize(): Promise<void> {
    await this.db.open()
  }

  // Enhanced save with relationships
  async saveAnnotation(annotation: Omit<StoredAnnotation, 'id'>): Promise<string> {
    const id = await this.db.transaction('rw', this.db.annotations, async () => {
      return await this.db.annotations.add(annotation)
    })
    return id
  }

  // Advanced search capabilities
  async searchAnnotations(query: SearchQuery): Promise<StoredAnnotation[]> {
    let collection = this.db.annotations.toCollection()

    if (query.text) {
      collection = collection.filter(annotation => 
        annotation.title.toLowerCase().includes(query.text!.toLowerCase()) ||
        annotation.description?.toLowerCase().includes(query.text!.toLowerCase())
      )
    }

    if (query.tags && query.tags.length > 0) {
      collection = collection.filter(annotation => 
        annotation.tags.some(tag => query.tags!.includes(tag))
      )
    }

    if (query.dateFrom) {
      collection = collection.filter(annotation => 
        annotation.createdAt >= query.dateFrom!
      )
    }

    return await collection.toArray()
  }

  // Bulk operations
  async saveAnnotations(annotations: StoredAnnotation[]): Promise<string[]> {
    return await this.db.annotations.bulkPut(annotations)
  }

  async deleteAnnotations(ids: string[]): Promise<void> {
    await this.db.annotations.bulkDelete(ids)
  }

  // Tag relationship management
  async addTagsToAnnotation(annotationId: string, tagNames: string[]): Promise<void> {
    await this.db.transaction('rw', this.db.annotationTags, this.db.tags, async () => {
      for (const tagName of tagNames) {
        let tag = await this.db.tags.where('name').equals(tagName).first()
        if (!tag) {
          tag = await this.db.tags.add({
            name: tagName,
            color: generateTagColor(),
            count: 0,
            createdAt: new Date()
          })
        }
        
        await this.db.annotationTags.add({
          annotationId,
          tagId: tag.id
        })
      }
    })
  }
}
```

### Migration Strategy

```typescript
// Migration from current IndexedDB to Dexie
async function migrateToDexie(): Promise<void> {
  const oldDbName = 'AnnoMarkDB'
  const oldVersion = 1
  
  // Check if old database exists
  const exists = await indexedDB.databases().then(dbs => 
    dbs.some(db => db.name === oldDbName && db.version === oldVersion)
  )

  if (exists) {
    // Migrate data from old database
    const oldDb = await openOldDatabase()
    const annotations = await getAllFromOldDatabase(oldDb)
    
    // Save to new Dexie database
    const dexieService = new DexieStorageService()
    await dexieService.initialize()
    await dexieService.saveAnnotations(annotations)
    
    // Clean up old database
    await oldDb.close()
    await indexedDB.deleteDatabase(oldDbName)
  }
}
```

## Performance Improvements Expected

### Query Performance
- **Indexed Queries**: Up to 10x faster for filtered searches
- **Bulk Operations**: 5-10x faster for multiple operations
- **Memory Usage**: Reduced memory footprint with streaming queries

### Developer Experience
- **Code Reduction**: ~70% less boilerplate code
- **Type Safety**: Better TypeScript error detection
- **Debugging**: Enhanced error messages and debugging capabilities
- **Maintainability**: Cleaner, more readable code structure

## File Changes Required

### New Files
- `src/services/dexie-storage.ts` - New Dexie-based service
- `src/utils/migration.ts` - Database migration utilities

### Modified Files
- `src/services/indexeddb-storage.ts` - Replace with Dexie implementation
- `src/background/messages/save-annotation.ts` - Update to use new service
- `src/background/messages/get-annotations.ts` - Update to use new service
- `src/background/messages/delete-annotation.ts` - Update to use new service
- `package.json` - Add Dexie.js dependency

### Removed Files
- Complex IndexedDB wrapper code (replaced by Dexie)
- Manual cursor management code
- Custom transaction handling

## Testing Strategy

### Migration Testing
1. **Data Integrity**: Verify all data migrates correctly
2. **Performance Comparison**: Benchmark old vs new implementation
3. **Edge Cases**: Test with empty database, corrupted data
4. **Browser Compatibility**: Test across Chrome, Firefox, Safari, Edge

### Functional Testing
1. **CRUD Operations**: Test all create, read, update, delete operations
2. **Search Functionality**: Test complex search queries
3. **Bulk Operations**: Test batch operations performance
4. **Error Handling**: Test error scenarios and recovery

### Integration Testing
1. **Gallery Component**: Ensure compatibility with existing UI
2. **Background Handlers**: Test all message handlers
3. **Annotation Editor**: Test save functionality end-to-end

## Rollback Plan

If migration fails:
1. **Backup Strategy**: Export current data before migration
2. **Fallback**: Keep old service available as fallback
3. **Progressive Migration**: Migrate gradually with feature flags
4. **User Notification**: Clear error messages and recovery options

## Success Metrics

1. **Performance**: 50%+ improvement in query speed
2. **Code Quality**: 70% reduction in boilerplate code
3. **Type Safety**: 100% TypeScript coverage for database operations
4. **User Experience**: Seamless migration with no data loss
5. **Maintainability**: Improved code readability and debugging

---

**Migration Priority**: High - This will significantly improve code quality and performance
**Estimated Timeline**: 2-3 days for complete migration
**Risk Level**: Low - Dexie is well-tested and backward compatible

## Next Steps

1. **Immediate**: Install Dexie.js and begin Phase 1
2. **Short-term**: Complete core service migration (Phase 1-2)
3. **Medium-term**: Implement enhanced features (Phase 3)
4. **Long-term**: Optimize and extend capabilities (Phase 4-5)
