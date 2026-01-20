# Anno-Mark Floating Annotation Button Implementation Plan

## Project Overview

**Goal**: Implement a floating action button (FAB) that provides instant screenshot capture and annotation capabilities without interrupting the user's browsing experience.

**Key Requirements**:
- Floating button accessible on any web page (top-right corner)
- Click triggers immediate screenshot capture
- Inline annotation overlay (transparent, maintains page context)
- Auto-save functionality when editor is closed
- Seamless integration with existing Plasmo architecture

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create enhanced message types for FAB workflow
- [ ] Update background service for inline workflow
- [ ] Create messaging utilities for new communication patterns

### Phase 2: Floating Action Button (FAB)
- [ ] Create FAB component with Plasmo overlay system
- [ ] Style FAB with Tailwind CSS and animations
- [ ] Implement click handler to trigger capture workflow
- [ ] Add hover effects and responsive design

### Phase 3: Inline Annotation Editor
- [ ] Adapt existing editor for overlay use
- [ ] Create transparent overlay system
- [ ] Implement auto-save and close functionality
- [ ] Add escape key and click-outside handlers

### Phase 4: Integration & Testing
- [ ] Integrate all components with messaging system
- [ ] Test cross-browser compatibility
- [ ] Optimize performance and memory usage
- [ ] Final testing and bug fixes

## File Creation Checklist

### New Files to Create
- [ ] `src/contents/floating-button.tsx` - Main FAB component
- [ ] `src/contents/floating-button.css` - FAB styling and animations
- [ ] `src/contents/inline-editor.tsx` - Inline annotation overlay
- [ ] `src/contents/inline-editor.css` - Inline editor styling

## File Modification Checklist

### Existing Files to Update
- [ ] `src/types/messages.ts` - Add new message types for FAB workflow
- [ ] `src/background.ts` - Enhance CaptureService for inline workflow
- [ ] `src/utils/messaging.ts` - Add convenience methods for new messages

## Detailed Implementation Specifications

### 1. Enhanced Message Types (`src/types/messages.ts`)

**New Message Types to Add**:
```typescript
// Trigger inline capture from FAB
export interface TriggerInlineCaptureMessage {
  type: 'TRIGGER_INLINE_CAPTURE'
}

// Show inline editor with captured data
export interface ShowInlineEditorMessage {
  type: 'SHOW_INLINE_EDITOR'
  data: {
    dataUrl: string
    width: number
    height: number
  }
}

// Hide inline editor (auto-save)
export interface HideInlineEditorMessage {
  type: 'HIDE_INLINE_EDITOR'
  data?: {
    annotations?: AnnotationAction[]
    dataUrl?: string
  }
}

// Inline editor ready response
export interface InlineEditorReadyMessage {
  type: 'INLINE_EDITOR_READY'
}
```

**Tasks**:
- [ ] Add new message interfaces
- [ ] Update ExtensionMessage union type
- [ ] Ensure type safety across all message types

### 2. Floating Action Button (`src/contents/floating-button.tsx`)

**Component Specifications**:
- Plasmo overlay with fixed positioning
- Top-right corner placement (20px from edges)
- Camera/screenshot icon design
- Smooth animations and hover effects
- Z-index management to avoid conflicts

**Key Features**:
- [ ] Fixed positioning in top-right corner
- [ ] Camera icon with hover effects
- [ ] Click handler to trigger capture workflow
- [ ] Smooth fade-in animation on page load
- [ ] Responsive sizing for different screen sizes
- [ ] Proper z-index layering

**Messaging Integration**:
- [ ] Send `TRIGGER_INLINE_CAPTURE` message to background
- [ ] Handle capture progress indicators
- [ ] Error handling and fallback mechanisms

### 3. FAB Styling (`src/contents/floating-button.css`)

**Design Requirements**:
- Modern, unobtrusive design
- Smooth transitions and micro-interactions
- Dark/light theme support
- Mobile-responsive sizing

**CSS Tasks**:
- [ ] Base button styling (colors, shadows, borders)
- [ ] Hover and active state animations
- [ ] Positioning and z-index management
- [ ] Responsive breakpoints
- [ ] Theme-aware color variables
- [ ] Smooth transitions (0.2s ease)

### 4. Inline Editor Overlay (`src/contents/inline-editor.tsx`)

**Adaptation Requirements**:
- Full-screen transparent overlay
- Preserve all existing annotation tools
- Auto-save functionality
- Context preservation with original page

**Key Features to Implement**:
- [ ] Full-screen overlay with transparent background
- [ ] Centered annotation interface
- [ ] All existing tools (arrow, rectangle, text, blur, etc.)
- [ ] Close button (X) in top-right corner
- [ ] Save/Export functionality
- [ ] Escape key handler
- [ ] Click-outside-to-close functionality
- [ ] Auto-save on close

**Technical Implementation**:
- [ ] Adapt canvas setup for overlay context
- [ ] Maintain existing drawing logic
- [ ] Implement auto-save to storage service
- [ ] Handle cleanup and resource management
- [ ] Proper event handling for overlay interactions

### 5. Inline Editor Styling (`src/contents/inline-editor.css`)

**Overlay Design**:
- Semi-transparent backdrop (rgba(0,0,0,0.5))
- Centered editor panel with proper spacing
- Proper z-index layering above FAB
- Smooth fade-in/out animations

**Styling Tasks**:
- [ ] Full-screen overlay backdrop
- [ ] Centered editor container styling
- [ ] Toolbar positioning and styling
- [ ] Canvas container with proper shadows
- [ ] Responsive design for various screen sizes
- [ ] Animation keyframes for fade effects

### 6. Enhanced Background Service (`src/background.ts`)

**CaptureService Modifications**:
- Add inline workflow handling
- Integrate with existing capture logic
- Proper error handling and cleanup

**New Methods to Implement**:
- [ ] `handleInlineCapture()` - Process FAB trigger
- [ ] `showInlineEditor()` - Display editor with captured data
- [ ] `handleInlineEditorClose()` - Process auto-save
- [ ] Error handling for inline workflow

**Integration Points**:
- [ ] Modify existing `handleStartCapture` for inline compatibility
- [ ] Enhance messaging handlers for new message types
- [ ] Maintain backward compatibility with existing tab-based editor

### 7. Enhanced Messaging Utilities (`src/utils/messaging.ts`)

**New Convenience Functions**:
```typescript
// Send inline capture trigger
export async function triggerInlineCapture(): Promise<ExtensionMessage | null>

// Show inline editor with captured data
export async function showInlineEditor(data: {
  dataUrl: string
  width: number
  height: number
}): Promise<ExtensionMessage | null>

// Hide inline editor with auto-save
export async function hideInlineEditor(data?: {
  annotations?: AnnotationAction[]
  dataUrl?: string
}): Promise<ExtensionMessage | null>
```

**Implementation Tasks**:
- [ ] Add new message sending functions
- [ ] Create response handlers for inline workflow
- [ ] Add timeout and error handling
- [ ] Maintain existing function compatibility

## Progress Tracking

### Component Completion Status
- [ ] **Message Types**: All new interfaces added and tested
- [ ] **FAB Component**: Fully functional with styling and animations
- [ ] **Inline Editor**: Complete adaptation of existing editor
- [ ] **Background Service**: Enhanced with inline workflow support
- [ ] **Messaging Utils**: All new convenience functions implemented
- [ ] **Styling**: All CSS files complete with responsive design

### Phase Completion Status
- [ ] **Phase 1 - Infrastructure**: Core messaging and background enhancements
- [ ] **Phase 2 - FAB**: Floating button fully implemented and styled
- [ ] **Phase 3 - Inline Editor**: Annotation overlay complete with auto-save
- [ ] **Phase 4 - Integration**: All components integrated and tested

### Final Testing Checklist
- [ ] Cross-browser compatibility testing
- [ ] Performance optimization (large screenshots)
- [ ] Memory leak prevention
- [ ] Error handling verification
- [ ] Mobile responsiveness testing
- [ ] Accessibility compliance
- [ ] End-to-end workflow testing

## Implementation Notes

### Plasmo Philosophy Compliance
✅ **Overlay System**: Using Plasmo's overlay for proper isolation
✅ **Messaging Patterns**: Following established type-safe messaging
✅ **Service Architecture**: Maintaining service-oriented design
✅ **Storage Integration**: Leveraging existing storage service
✅ **Content Scripts**: Proper content script separation and isolation

### Technical Considerations
- **Z-Index Management**: Proper layering to avoid conflicts with page content
- **Memory Management**: Efficient handling of large screenshot data
- **Event Handling**: Proper cleanup of event listeners
- **Cross-Origin**: Handling different page contexts and restrictions
- **Performance**: Optimizing for smooth animations and interactions

### User Experience Goals
- **Non-Intrusive**: FAB doesn't interfere with page content
- **Instant Access**: One-click access to annotation tools
- **Context Preservation**: User maintains awareness of original page
- **Quick Exit**: Multiple ways to close (X, escape, click-outside)
- **Auto-Save**: No manual save required to preserve work

---

## Usage Instructions for LLMs

When working on this implementation plan:

1. **Update Progress**: Mark completed tasks with [x] as you implement them
2. **Track Phases**: Update phase completion status when all tasks in a phase are done
3. **Document Issues**: Add notes for any problems encountered during implementation
4. **Test Thoroughly**: Ensure each component works independently before integration
5. **Follow Plasmo Patterns**: Maintain consistency with existing code architecture

This plan is designed to be self-documenting and trackable by multiple LLMs working on the project over time.
