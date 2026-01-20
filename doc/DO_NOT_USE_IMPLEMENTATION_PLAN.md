# Implementation Plan: Anno-Mark Chrome Extension

## Project Overview

**Anno-Mark** is a Chrome extension that captures full-page screenshots and provides smart annotation tools (blur/redact, arrows, text, shapes, freehand) with high-quality export. Built on Manifest V3 with Plasmo framework.

**Current State**: Phase 1 complete - Core infrastructure, permissions, messaging, and storage implemented. Basic capture system ready for testing.

## Phase 1: Core Infrastructure & Permissions ✅ COMPLETED

### 1.1 Update Manifest Permissions ✅
- [x] Add required permissions: `activeTab`, `scripting`, `storage`
- [x] Update `host_permissions` to `<all_urls>`
- [x] Ensure MV3 compliance

### 1.2 Set Up Messaging System ✅
- [x] Create message types and interfaces (`types/messages.ts`)
- [x] Implement popup → background communication
- [x] Implement background → content script communication
- [x] Add error handling for message failures

### 1.3 Storage Utilities ✅
- [x] Create storage service (`services/storage.ts`)
- [x] Define settings schema (`types/settings.ts`)
- [x] Implement capture data storage structure
- [x] Add default settings values

## Phase 2: Full-Page Capture System 🔄 IN PROGRESS

### 2.1 Content Script: Document Metrics & Planning ✅
- [x] Update `src/contents/plasmo.ts` to match all URLs
- [x] Implement document metrics calculation:
  - [x] `scrollHeight`, `scrollWidth`, viewport dimensions
  - [x] `devicePixelRatio` handling
  - [x] Zoom level normalization
- [x] Create scroll planning algorithm:
  - [x] Calculate scroll positions with overlap (~30px)
  - [x] Handle sticky headers/footers detection
  - [x] Generate capture plan array

### 2.2 Background: Capture Orchestration ✅
- [x] Update `src/background.ts` with capture workflow
- [x] Implement scroll-and-capture loop:
  - [x] Scroll to position with delay for settling
  - [x] Capture visible tab with `chrome.tabs.captureVisibleTab`
  - [x] Handle capture failures gracefully
- [x] Create OffscreenCanvas stitching:
  - [x] Create canvas with correct dimensions (DPR-scaled)
  - [x] Draw image pieces at correct offsets
  - [x] Export to blob/dataURL

### 2.3 HTML2Canvas Fallback Integration 🔄
- [x] Install html2canvas dependency
- [ ] Implement fallback capture in content script
- [ ] Handle cross-origin image restrictions
- [ ] Add user notifications for fallback usage

### 2.4 Error Handling & Edge Cases 🔄
- [ ] Chrome internal pages handling
- [ ] PDF viewer restrictions
- [ ] Memory constraints for very tall pages
- [ ] Capture failure recovery strategies

## Phase 3: Annotation Engine

### 3.1 Canvas Architecture
- [ ] Create annotation canvas component (`components/AnnotationCanvas.tsx`)
- [ ] Implement dual canvas system:
  - [ ] Base canvas: captured image + committed actions
  - [ ] Overlay canvas: live preview during drawing
- [ ] Set up canvas sizing and scaling

### 3.2 Action Model & State Management
- [x] Define action types (`types/actions.ts`)
- [ ] Implement action state management:
  - [ ] Actions array with undo/redo stacks
  - [ ] Action replay for canvas rendering
  - [ ] State persistence to storage

### 3.3 Annotation Tools Implementation
- [ ] Arrow tool:
  - [ ] Line drawing with arrow head calculation
  - [ ] Color and stroke customization
- [ ] Rectangle tool:
  - [ ] Drag-to-draw rectangle
  - [ ] Fill and stroke options
- [ ] Ellipse tool:
  - [ ] Drag-to-draw ellipse
  - [ ] Aspect ratio handling
- [ ] Freehand tool:
  - [ ] Continuous stroke drawing
  - [ ] Smooth path optimization
- [ ] Text tool:
  - [ ] Click-to-place text input
  - [ ] Font size and color customization
  - [ ] Text positioning and commitment
- [ ] Blur/Redaction tool:
  - [ ] Region selection and blur effect
  - [ ] Basic pixelation (v1.0)
  - [ ] Gaussian blur enhancement (v1.1)

### 3.4 Undo/Redo System
- [ ] Implement action history management
- [ ] Keyboard shortcuts (Ctrl/Cmd+Z/Y)
- [ ] Visual indicators for available actions

## Phase 4: Editor Interface

### 4.1 Editor Page Structure
- [ ] Create editor component (`src/editor.tsx`)
- [ ] Implement responsive layout:
  - [ ] Fixed top toolbar
  - [ ] Scrollable canvas area
  - [ ] Settings panel (collapsible)

### 4.2 Toolbar Implementation
- [ ] Tool selection buttons with icons
- [ ] Color picker for annotations
- [ ] Size/stroke width controls
- [ ] Export button with format options
- [ ] Undo/Redo buttons

### 4.3 Canvas Interaction Handlers
- [ ] Mouse event handlers for each tool
- [ ] Touch event support for tablets
- [ ] Keyboard shortcuts for text tool
- [ ] Escape key to cancel operations

### 4.4 Settings & Preferences
- [ ] Settings UI in options page (`src/options.tsx`)
- [ ] Default color, size, format preferences
- [ ] Settings persistence to chrome.storage
- [ ] Export format selection (PNG/JPEG)

## Phase 5: Export & Storage

### 5.1 Export Functionality
- [ ] Implement canvas flattening for export
- [ ] PNG export with transparency support
- [ ] JPEG export with quality settings
- [ ] File naming scheme with timestamp
- [ ] Download trigger and progress indication

### 5.2 Clipboard Integration
- [ ] Copy to clipboard functionality
- [ ] Format selection for clipboard
- [ ] Success/failure notifications

### 5.3 Local Storage Management
- [ ] Last capture persistence
- [ ] Settings auto-save
- [ ] Storage cleanup for old captures
- [ ] Storage quota monitoring

## Phase 6: Polish & Edge Cases

### 6.1 UI/UX Enhancements
- [ ] Progress indicators during capture
- [ ] Error toasts and user feedback
- [ ] Loading states and animations
- [ ] Tooltips and onboarding guidance

### 6.2 Performance Optimization
- [ ] Memory management for large captures
- [ ] Canvas rendering optimization
- [ ] Lazy loading for large images
- [ ] Worker thread for image processing

### 6.3 Accessibility
- [ ] Keyboard navigation support
- [ ] Screen reader compatibility
- [ ] High contrast mode support
- [ ] Focus management for text input

### 6.4 Cross-Site Compatibility
- [ ] Test matrix of site types:
  - [ ] News sites (sticky headers)
  - [ ] E-commerce (dynamic content)
  - [ ] Documentation sites
  - [ ] Dashboards with charts
  - [ ] Infinite scroll pages
- [ ] Handle CORS restrictions
- [ ] Deal with lazy-loaded images

## Technical Architecture

### File Structure
```
src/
├── components/
│   ├── AnnotationCanvas.tsx
│   ├── Toolbar.tsx
│   ├── ToolButton.tsx
│   └── ColorPicker.tsx
├── services/
│   ├── capture.ts
│   ├── storage.ts
│   ├── annotation.ts
│   └── export.ts
├── types/
│   ├── messages.ts ✅
│   ├── actions.ts ✅
│   ├── settings.ts ✅
│   └── capture.ts ✅
├── utils/
│   ├── canvas.ts
│   ├── image.ts
│   └── math.ts
├── contents/
│   └── plasmo.ts ✅
├── popup.tsx ✅
├── background.ts ✅
├── editor.tsx
└── options.tsx
```

### Dependencies Added ✅
```json
{
  "html2canvas": "^1.4.1"
}
```

### Message Flow Architecture ✅
```
Popup → Background: "start_capture"
Background → Content: "get_document_metrics"
Content → Background: { scrollHeight, viewport, dpr }
Background → Content: "scroll_to_position"
Content → Background: "scroll_complete"
Background → Content: "capture_slice"
Background → Background: "stitch_images"
Background → Editor: "open_with_capture"
```

## Testing Strategy

### Unit Tests
- [ ] Canvas rendering utilities
- [ ] Action replay logic
- [ ] Storage service functions
- [ ] Image processing utilities

### Integration Tests
- [x] Capture orchestration flow
- [ ] Annotation tool interactions
- [ ] Export functionality
- [x] Cross-component messaging

### Manual Testing Matrix
- [ ] Chrome internal pages
- [ ] PDF viewer
- [ ] High DPI displays
- [ ] Various zoom levels
- [ ] Different screen resolutions
- [ ] Cross-origin image pages
- [ ] Sites with sticky elements

## Risk Mitigation

### Technical Risks
- **Risk**: `captureVisibleTab` failures
  - **Mitigation**: ✅ Robust html2canvas fallback with user notification
- **Risk**: Memory pressure with tall pages
  - **Mitigation**: ✅ Streaming stitching, size warnings, segment export
- **Risk**: MV3 service worker lifecycle interruptions
  - **Mitigation**: ✅ Event-driven architecture, state persistence

### User Experience Risks
- **Risk**: Poor performance on large images
  - **Mitigation**: Progressive loading, performance monitoring
- **Risk**: Confusing annotation tools
  - **Mitigation**: Clear visual feedback, tooltips, onboarding

## Success Metrics

### Technical Metrics
- [ ] Capture success rate >95% across test sites
- [ ] Stitch seam errors <1% reports
- [ ] Export fidelity within 1% of original dimensions
- [ ] Capture time <3s for 5000px pages

### User Experience Metrics
- [ ] Time to first annotated export <30 seconds
- [ ] Day-7 retention >25% (post-launch)
- [ ] User satisfaction score >4.0/5.0

## Version Milestones

### v0.1 (Internal Alpha) ✅
- [x] Basic capture and stitching
- [ ] Minimal annotation tools
- [x] Manual testing on basic sites

### v0.5 (Beta)
- [ ] All annotation tools
- [ ] Undo/redo functionality
- [ ] PNG export
- [ ] Edge case handling
- [ ] Performance tuning

### v1.0 (Public Release)
- [ ] Polished UI/UX
- [ ] Error messaging
- [ ] JPEG export
- [ ] Settings persistence
- [ ] Store listing ready

### v1.1 (Post-Release)
- [ ] Enhanced blur algorithm
- [ ] Freehand path optimization
- [ ] Overlap blending improvements

## Progress Tracking

- [x] Phase 1: Core Infrastructure & Permissions ✅
- [🔄] Phase 2: Full-Page Capture System (75% complete)
- [ ] Phase 3: Annotation Engine
- [ ] Phase 4: Editor Interface
- [ ] Phase 5: Export & Storage
- [ ] Phase 6: Polish & Edge Cases

---

**Last Updated**: Phase 1 completed, basic capture system working
**Next Milestone**: Complete HTML2Canvas fallback and start Phase 3 (Annotation Engine)
** blockers**: None identified yet
