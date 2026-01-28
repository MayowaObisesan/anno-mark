# Text Editor Implementation Plan

## Overview
Replace the current `prompt()`-based text input with a professional inline text editing experience similar to modern design tools (Figma, Sketch, etc.). This implementation will provide real-time visual feedback, multi-line support, and seamless integration with existing annotation system.

## Problem Statement
**Current Issues:**
- Uses `prompt()` which blocks entire browser interface
- No visual feedback where text will appear
- Poor styling and customization options
- Doesn't support multi-line text
- Unprofessional user experience
- Can't edit existing text annotations

**Desired Solution:**
- Inline text input overlay at click position
- Real-time preview as user types
- Multi-line text support
- Edit existing text annotations
- Professional keyboard shortcuts (Enter to finish, Escape to cancel)
- Integration with existing toolbar controls

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 Create TextInputOverlay Component
**File:** `src/components/annotation_engine/components/TextInputOverlay.tsx`

**Purpose:** Styled input/textarea overlay that appears at cursor position

**Features:**
- Auto-positioning at click coordinates
- Auto-sizing based on content
- Styled to match annotation tool design
- Multi-line support with textarea
- Proper focus management
- Keyboard event handling

**Props Interface:**
```typescript
interface TextInputOverlayProps {
  position: Point
  initialText?: string
  fontSize: number
  fontFamily: string
  color: string
  onComplete: (text: string) => void
  onCancel: () => void
}
```

#### 1.2 Enhanced TextTool State Management
**File:** `src/components/annotation_engine/tools/TextTool.ts`

**New State Properties:**
- `isEditing: boolean` - Track if text is being edited
- `editingAnnotation: TextAnnotation | null` - Current annotation being edited
- `inputPosition: Point` - Position for text input overlay
- `inputText: string` - Current text being typed

**New Methods:**
- `startTextEditing(position: Point, annotation?: TextAnnotation)` - Start editing session
- `finishTextEditing(text: string)` - Complete editing and create/update annotation
- `cancelTextEditing()` - Cancel current editing session
- `getEditText(position: Point)` - Find existing text at position

#### 1.3 Canvas Coordinate System Integration
**Challenge:** Map canvas coordinates to screen coordinates for overlay positioning

**Solution:**
- Use existing `getPoint()` method for coordinate transformation
- Calculate screen position using `canvas.getBoundingClientRect()`
- Account for canvas scaling and positioning
- Ensure pixel-perfect overlay positioning

### Phase 2: Enhanced User Experience

#### 2.1 Real-time Text Preview Integration
**Integration:** Use existing preview system from real-time preview implementation

**Implementation:**
- Show text preview as user types with current tool properties
- Apply font size, family, and color in real-time
- Maintain preview during entire editing session
- Clean separation between preview and final annotation

#### 2.2 Text Editing Workflow
**New Text Workflow:**
1. User clicks on canvas → `startTextEditing()` called
2. TextInputOverlay appears at click position
3. User types → Real-time preview updates
4. Enter key or click outside → `finishTextEditing()` called
5. Annotation created with final text

**Edit Existing Text Workflow:**
1. User clicks existing text → Hit detection in `getEditText()`
2. Current annotation loaded into overlay
3. User modifies text → Preview updates
4. Enter key or click outside → `updateAnnotation()` called
5. Existing annotation updated with new text

**Cancel Workflow:**
- Escape key → `cancelTextEditing()` called
- Overlay removed, no annotation created/updated
- Preview cleared

#### 2.3 Keyboard Event Handling
**Key Bindings:**
- `Enter` - Finish text input (create/update annotation)
- `Shift+Enter` - New line in multi-line text
- `Escape` - Cancel text input
- `Delete` - Remove selected text annotation (when not editing)

**Implementation:**
- Handle events at component level
- Prevent conflicts with existing keyboard shortcuts
- Proper event propagation management

### Phase 3: Advanced Features

#### 3.1 Multi-line Text Support
**Textarea Implementation:**
- Use `<textarea>` instead of `<input>` for better multi-line experience
- Auto-resize textarea based on content
- Preserve line breaks in final annotation
- Handle long text content gracefully

**Auto-resize Logic:**
```typescript
const resizeTextarea = (textarea: HTMLTextAreaElement) => {
  textarea.style.height = 'auto'
  textarea.style.height = textarea.scrollHeight + 'px'
}
```

#### 3.2 Rich Text Properties Panel
**Inline Controls:**
- Show font size, family, color while editing
- Live preview of property changes
- Connect with existing toolbar controls
- Maintain property state during editing

**Implementation:**
- Optional overlay panel near text input
- Real-time property application
- Integration with existing `setToolProperties()`

#### 3.3 Enhanced Selection and Hit Testing
**Text Hit Detection:**
- Improve `hitTest()` for better text selection
- Account for text dimensions and font metrics
- Consider multi-line text bounding boxes

**Visual Feedback:**
- Highlight text on hover
- Clear visual indication of selected text
- Cursor change over editable text

## Technical Implementation Details

### Component Architecture

```
TextInputOverlay (new)
├── Textarea with auto-resize
├── Position calculation logic
├── Event handlers (Enter, Escape)
├── Style integration (font, color)
└── Lifecycle management

TextTool (enhanced)
├── State management (editing, position, text)
├── Click handling (new vs. existing text)
├── Preview integration
├── Keyboard event handling
└── Annotation lifecycle management
```

### Integration Points

#### AnnotationEngine Integration:
**File:** `src/components/annotation_engine/AnnotationEngine.ts`

**Additions:**
- Text editing state management
- Overlay positioning support
- Text-specific event handling
- Integration with existing event system

#### AnnotationEngineComponent Integration:
**File:** `src/components/annotation_engine/AnnotationEngineComponent.tsx`

**Additions:**
- TextInputOverlay rendering
- Text editing state management
- Keyboard event handling
- Overlay lifecycle management

#### Selection System Enhancement:
**File:** `src/components/annotation_engine/engine/selection.ts`

**Enhancements:**
- Text-specific hit testing
- Text selection state
- Visual feedback for text selection

## Files to Create/Modify

### New Files:
1. `src/components/annotation_engine/components/TextInputOverlay.tsx` - Text input overlay component
2. `src/components/annotation_engine/components/TextPropertiesPanel.tsx` - Inline text property controls (optional)
3. `src/components/annotation_engine/components/index.ts` - Component exports

### Modified Files:
1. `src/components/annotation_engine/tools/TextTool.ts` - Complete rewrite for inline editing
2. `src/components/annotation_engine/AnnotationEngine.ts` - Add text editing state management
3. `src/components/annotation_engine/AnnotationEngineComponent.tsx` - Add overlay rendering and event handling
4. `src/components/annotation_engine/engine/selection.ts` - Enhance for text selection and hit testing
5. `src/components/annotation_engine/engine/Tool.ts` - Add optional text editing methods to interface

## Implementation Tasks

### Phase 1 Tasks:
- [ ] Create TextInputOverlay component with basic functionality
- [ ] Implement auto-positioning and styling
- [ ] Add keyboard event handling (Enter, Escape)
- [ ] Integrate with existing text tool
- [ ] Test basic click → type → finish workflow

### Phase 2 Tasks:
- [ ] Implement real-time text preview integration
- [ ] Add edit existing text functionality
- [ ] Enhance text hit testing for selection
- [ ] Implement cancel workflow (Escape key)
- [ ] Test complete editing workflow

### Phase 3 Tasks:
- [ ] Add multi-line textarea support
- [ ] Implement auto-resize functionality
- [ ] Add inline text properties panel
- [ ] Enhance visual feedback (hover, selection)
- [ ] Add delete functionality for selected text

### Integration Tasks:
- [ ] Update AnnotationEngine for text editing state
- [ ] Modify AnnotationEngineComponent for overlay rendering
- [ ] Enhance selection system for text
- [ ] Test integration with existing toolbar controls
- [ ] Verify keyboard shortcut compatibility

## UX Improvements Achieved

### Immediate Benefits:
✅ **No More Prompts:** Eliminate disruptive browser prompts
✅ **Visual Clarity:** See exactly where text will appear
✅ **Professional Feel:** Matches modern design tool standards
✅ **Multi-line Support:** Handle longer text content naturally

### Advanced Features:
✅ **Inline Editing:** Click existing text to edit
✅ **Real-time Feedback:** See changes as you type
✅ **Keyboard Efficiency:** Enter to finish, Escape to cancel
✅ **Property Integration:** Seamless toolbar controls integration

## Testing Strategy

### Unit Testing:
1. **TextInputOverlay Component:**
   - Positioning accuracy
   - Auto-resize functionality
   - Keyboard event handling
   - Styling and responsiveness

2. **TextTool Logic:**
   - State management transitions
   - Click handling (new vs. existing)
   - Preview integration
   - Annotation lifecycle

### Integration Testing:
1. **Basic Workflow:** Click, type, finish text creation
2. **Edit Workflow:** Click existing text, modify, save
3. **Cancel Workflow:** Start typing, cancel with Escape
4. **Multi-line Testing:** Enter new lines, auto-resize
5. **Property Testing:** Change font/size/color during editing

### Performance Testing:
1. **Typing Performance:** Smooth real-time preview
2. **Large Text Handling:** Performance with long content
3. **Multiple Overlays:** Handle multiple editing sessions
4. **Memory Management:** Proper cleanup and state reset

## Future Enhancements

### Potential Improvements:
1. **Rich Text Support:** Bold, italic, underline formatting
2. **Text Alignment:** Left, center, right alignment options
3. **Text Background:** Background color for text annotations
4. **Text Shadows:** Drop shadow effects for better visibility
5. **Spell Check:** Built-in spell checking functionality
6. **Text Templates:** Pre-defined text styles and templates
7. **Text Search:** Find and replace text annotations

### Maintenance Notes:
- **Accessibility:** Ensure keyboard navigation and screen reader support
- **Internationalization:** Support for RTL text and various fonts
- **Performance:** Monitor performance with large text content
- **Browser Compatibility:** Test across different browsers
- **Mobile Support:** Touch-friendly text editing interface

## Timeline Estimate

**Phase 1 (Core Infrastructure):** 2-3 days
**Phase 2 (Enhanced UX):** 2-3 days  
**Phase 3 (Advanced Features):** 1-2 days
**Testing and Polish:** 1-2 days

**Total Estimated Time:** 6-10 days

This comprehensive implementation will transform the text annotation experience from a basic prompt-based system to a professional, modern inline editor that integrates seamlessly with our existing real-time preview architecture and provides exceptional user experience.
