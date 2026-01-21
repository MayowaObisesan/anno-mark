# Canvas Annotation Fix Implementation Plan

## Overview
This document outlines the comprehensive plan to transform the current annotation editor into a production-ready, robust annotation engine that provides users with a modern annotation experience without compromising on performance, UI, and UX.

## Current State Analysis

### ✅ What's Already Fixed
- Text input now uses inline input instead of `prompt()`
- Blur tool uses proper canvas filters
- Basic canvas rendering structure is in place
- Undo/redo state management is implemented
- Tool selection and color picker work
- Proper styling with Radix UI components

### ❌ Critical Issues Remaining

#### 1. Canvas Coordinate System & Positioning
- Overlay canvas positioning doesn't properly align with base canvas when scaled
- Mouse event coordinates don't map correctly for different screen densities
- CSS transforms affect coordinate mapping
- Zoom-level handling missing

#### 2. Communication Flow Inconsistencies
- `plasmo-overlay.tsx` uses custom events (`show-overlay-editor`) while background script sends `SHOW_OVERLAY_EDITOR` messages
- Missing message handlers for proper overlay display
- Asynchronous handling issues and race conditions
- No error handling for communication failures

#### 3. Canvas Layering & Performance Issues
- Dual-canvas approach has synchronization problems
- Redraw logic has timing issues
- Memory leaks from event listeners not being cleaned up
- Inefficient clearing and redrawing cycles

#### 4. State Management Edge Cases
- Undo/redo can get out of sync with rapid actions
- History persistence issues
- State validation missing
- Concurrent action handling problems

## Implementation Plan

### Phase 1: Critical Infrastructure Fixes (Priority: IMMEDIATE)

#### 1.1 Fix Canvas Coordinate System
**Files to modify:** `src/components/AnnotationEditorCore.tsx`

**Tasks:**
- [ ] Implement proper coordinate transformation accounting for CSS transforms
- [ ] Ensure overlay canvas perfectly aligns with base canvas
- [ ] Add zoom-level handling for coordinate mapping
- [ ] Fix mouse event positioning for different screen densities
- [ ] Add coordinate system validation and debugging

**Implementation Details:**
```typescript
// Enhanced coordinate transformation
const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
  const canvas = overlayCanvasRef.current!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  
  // Account for page scroll and zoom
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft
  const scrollY = window.pageYOffset || document.documentElement.scrollTop
  
  return {
    x: (e.clientX - rect.left + scrollX) * scaleX,
    y: (e.clientY - rect.top + scrollY) * scaleY
  }
}

// Canvas position sync utility
const syncCanvasPositions = () => {
  if (!overlayCanvasRef.current || !baseCanvasRef.current) return
  
  const overlayCanvas = overlayCanvasRef.current
  const baseCanvas = baseCanvasRef.current
  
  // Ensure both canvases have same dimensions and position
  overlayCanvas.style.width = baseCanvas.style.width
  overlayCanvas.style.height = baseCanvas.style.height
  overlayCanvas.style.left = baseCanvas.offsetLeft + 'px'
  overlayCanvas.style.top = baseCanvas.offsetTop + 'px'
}
```

#### 1.2 Standardize Communication Flow
**Files to modify:** `src/contents/plasmo-overlay.tsx`, `src/background/messages/start-capture.ts`

**Tasks:**
- [ ] Replace custom events with consistent Plasmo messaging
- [ ] Fix message handlers in overlay component
- [ ] Add proper error handling for communication failures
- [ ] Implement message timeout handling
- [ ] Add message retry logic

**Implementation Details:**
```typescript
// In plasmo-overlay.tsx - Replace custom events with Plasmo messaging
useEffect(() => {
  const messageHandler = (message: any) => {
    switch (message.type) {
      case 'SHOW_OVERLAY_EDITOR':
        setImageData(message.data.dataUrl)
        setImageWidth(message.data.width)
        setImageHeight(message.data.height)
        setShowEditor(true)
        break
      case 'HIDE_OVERLAY_EDITOR':
        setShowEditor(false)
        break
    }
  }

  chrome.runtime.onMessage.addListener(messageHandler)
  return () => chrome.runtime.onMessage.removeListener(messageHandler)
}, [])

// In start-capture.ts - Fix showOverlayEditor function
async function showOverlayEditor(tabId: number, result: CaptureResult): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'SHOW_OVERLAY_EDITOR',
      data: {
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height
      }
    })
  } catch (error) {
    console.error('Failed to show overlay editor:', error)
    // Fallback to tab-based editor
    await openEditor(tabId, result)
  }
}
```

#### 1.3 Optimize Canvas Rendering
**Files to modify:** `src/components/AnnotationEditorCore.tsx`

**Tasks:**
- [ ] Fix dual-canvas synchronization issues
- [ ] Implement proper clearing and redrawing logic
- [ ] Add render optimization for large images
- [ ] Fix memory leaks from canvas references
- [ ] Add render performance monitoring

**Implementation Details:**
```typescript
// Optimized redraw function
const redrawActions = useCallback(() => {
  if (!baseCanvasRef.current || !overlayCanvasRef.current || !originalImageRef.current) return

  const startTime = performance.now()
  
  // Use requestAnimationFrame for smooth rendering
  requestAnimationFrame(() => {
    const baseCanvas = baseCanvasRef.current!
    const baseCtx = baseCanvas.getContext('2d')!
    
    // Clear and redraw base
    baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height)
    baseCtx.drawImage(originalImageRef.current!, 0, 0, width, height)
    
    // Draw all actions
    actions.forEach((action) => {
      drawAction(baseCtx, action)
    })
    
    // Clear overlay
    const overlayCanvas = overlayCanvasRef.current!
    const overlayCtx = overlayCanvas.getContext('2d')!
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
    
    // Performance logging
    const renderTime = performance.now() - startTime
    if (renderTime > 16) { // More than 60fps
      console.warn(`Slow render detected: ${renderTime}ms`)
    }
  })
}, [actions, width, height])
```

### Phase 2: Enhanced User Experience (Priority: HIGH)

#### 2.1 Improve Text Tool
**Files to modify:** `src/components/AnnotationEditorCore.tsx`

**Tasks:**
- [ ] Add text styling options (font family, size, alignment)
- [ ] Implement text editing capabilities for existing text annotations
- [ ] Add text background/border options
- [ ] Fix text positioning and alignment
- [ ] Add text resize handles

**Implementation Details:**
```typescript
// Enhanced text action interface
interface TextAnnotation extends AnnotationAction {
  text: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  backgroundColor?: string
  borderWidth?: number
  borderColor?: string
}

// Text editing component
const TextEditor = ({ annotation, onSave, onCancel }) => {
  const [text, setText] = useState(annotation.text)
  const [fontSize, setFontSize] = useState(annotation.fontSize)
  const [fontFamily, setFontFamily] = useState(annotation.fontFamily)
  
  return (
    <div className="text-editor-popup">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ fontSize: `${fontSize}px`, fontFamily }}
      />
      <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
        <option value="Arial">Arial</option>
        <option value="Helvetica">Helvetica</option>
        <option value="Times New Roman">Times New Roman</option>
      </select>
      <button onClick={() => onSave({ ...annotation, text, fontSize, fontFamily })}>
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}
```

#### 2.2 Enhanced Drawing Tools
**Files to modify:** `src/components/AnnotationEditorCore.tsx`

**Tasks:**
- [ ] Improve arrow drawing with better arrowheads
- [ ] Add shape fill options for rectangles/ellipses
- [ ] Implement smoother freehand drawing with path smoothing
- [ ] Add undo/redo keyboard shortcuts
- [ ] Add tool cursor indicators

**Implementation Details:**
```typescript
// Enhanced arrow drawing
const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, options?: ArrowOptions) => {
  const headLength = options?.headLength || 15
  const headAngle = options?.headAngle || Math.PI / 6
  const angle = Math.atan2(toY - fromY, toX - fromX)

  // Draw line
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()

  // Draw enhanced arrowhead
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(
    toX - headLength * Math.cos(angle - headAngle),
    toY - headLength * Math.sin(angle - headAngle)
  )
  ctx.moveTo(toX, toY)
  ctx.lineTo(
    toX - headLength * Math.cos(angle + headAngle),
    toY - headLength * Math.sin(angle + headAngle)
  )
  ctx.stroke()
}

// Smooth freehand drawing
const smoothPath = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
  if (points.length < 3) return points
  
  const smoothed: { x: number; y: number }[] = []
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      smoothed.push(points[i])
    } else {
      const prev = points[i - 1]
      const curr = points[i]
      const next = points[i + 1]
      
      smoothed.push({
        x: curr.x * 0.5 + (prev.x + next.x) * 0.25,
        y: curr.y * 0.5 + (prev.y + next.y) * 0.25
      })
    }
  }
  return smoothed
}
```

#### 2.3 Advanced Blur Options
**Files to modify:** `src/components/AnnotationEditorCore.tsx`

**Tasks:**
- [ ] Add adjustable blur intensity
- [ ] Implement different blur types (gaussian, motion, pixelate)
- [ ] Add blur preview before applying
- [ ] Fix blur performance on large areas

**Implementation Details:**
```typescript
interface BlurOptions {
  type: 'gaussian' | 'motion' | 'pixelate'
  intensity: number
  direction?: 'horizontal' | 'vertical' // for motion blur
}

const applyBlur = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, options: BlurOptions) => {
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')!
  tempCanvas.width = width
  tempCanvas.height = height
  
  // Copy the area to blur
  tempCtx.drawImage(ctx.canvas, x, y, width, height, 0, 0, width, height)
  
  switch (options.type) {
    case 'gaussian':
      ctx.filter = `blur(${options.intensity}px)`
      break
    case 'motion':
      const direction = options.direction === 'horizontal' ? 'X' : 'Y'
      ctx.filter = `motion-blur(${options.intensity}px ${direction})`
      break
    case 'pixelate':
      // Custom pixelation implementation
      const pixelSize = Math.max(2, Math.floor(options.intensity / 2))
      pixelate(tempCtx, width, height, pixelSize)
      ctx.filter = 'none'
      break
  }
  
  ctx.drawImage(tempCanvas, x, y)
  ctx.filter = 'none'
}
```

### Phase 3: Production-Ready Features (Priority: MEDIUM)

#### 3.1 Annotation Management
**Files to modify:** `src/components/AnnotationEditorCore.tsx`, `src/types/annotations.ts`

**Tasks:**
- [ ] Add selection tool for manipulating existing annotations
- [ ] Implement annotation deletion and editing
- [ ] Add layer reordering (bring to front/send to back)
- [ ] Implement annotation grouping
- [ ] Add annotation properties panel

**Implementation Details:**
```typescript
// Selection and manipulation
interface AnnotationSelection {
  id: string
  handle: 'move' | 'resize-top-left' | 'resize-top-right' | 'resize-bottom-left' | 'resize-bottom-right'
}

const useAnnotationSelection = () => {
  const [selectedAnnotation, setSelectedAnnotation] = useState<AnnotationSelection | null>(null)
  const [draggedAnnotation, setDraggedAnnotation] = useState<string | null>(null)
  
  const selectAnnotation = (id: string, handle?: AnnotationSelection['handle']) => {
    setSelectedAnnotation({ id, handle: handle || 'move' })
  }
  
  const deleteAnnotation = (id: string) => {
    setActions(prev => prev.filter(action => action.id !== id))
    setSelectedAnnotation(null)
  }
  
  const moveAnnotation = (id: string, deltaX: number, deltaY: number) => {
    setActions(prev => prev.map(action => {
      if (action.id === id) {
        return {
          ...action,
          startX: action.startX + deltaX,
          startY: action.startY + deltaY,
          endX: action.endX ? action.endX + deltaX : undefined,
          endY: action.endY ? action.endY + deltaY : undefined
        }
      }
      return action
    }))
  }
  
  return { selectedAnnotation, selectAnnotation, deleteAnnotation, moveAnnotation, draggedAnnotation, setDraggedAnnotation }
}
```

#### 3.2 Export & Storage Enhancements
**Files to modify:** `src/components/AnnotationEditorCore.tsx`, `src/background/messages/save-annotation.ts`

**Tasks:**
- [ ] Add multiple export formats (PNG, JPEG, WebP)
- [ ] Implement quality settings for lossy formats
- [ ] Add annotation data export (JSON format)
- [ ] Implement clipboard integration
- [ ] Add batch export options

**Implementation Details:**
```typescript
interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp'
  quality?: number // for JPEG/WebP
  includeAnnotations: boolean
  exportAnnotationsSeparately: boolean
}

const exportImage = async (options: ExportOptions) => {
  const exportCanvas = document.createElement("canvas")
  exportCanvas.width = width
  exportCanvas.height = height
  const exportCtx = exportCanvas.getContext("2d")!

  // Draw base image
  exportCtx.drawImage(baseCanvasRef.current!, 0, 0)

  if (options.includeAnnotations) {
    // Draw all actions
    actions.forEach((action) => {
      drawAction(exportCtx, action)
    })
  }

  // Export based on format
  let mimeType: string
  let fileExtension: string
  
  switch (options.format) {
    case 'jpeg':
      mimeType = 'image/jpeg'
      fileExtension = 'jpg'
      break
    case 'webp':
      mimeType = 'image/webp'
      fileExtension = 'webp'
      break
    default:
      mimeType = 'image/png'
      fileExtension = 'png'
  }

  const dataUrl = exportCanvas.toDataURL(mimeType, options.quality || 0.9)
  
  // Create download
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `annotation-${Date.now()}.${fileExtension}`
  a.click()

  // Export annotations separately if requested
  if (options.exportAnnotationsSeparately) {
    const annotationData = JSON.stringify(actions, null, 2)
    const blob = new Blob([annotationData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const annotationLink = document.createElement('a')
    annotationLink.href = url
    annotationLink.download = `annotations-${Date.now()}.json`
    annotationLink.click()
    
    URL.revokeObjectURL(url)
  }
}
```

#### 3.3 Performance & Accessibility
**Files to modify:** `src/components/AnnotationEditorCore.tsx`, `src/contents/plasmo-overlay.css`

**Tasks:**
- [ ] Implement canvas virtualization for very large images
- [ ] Add loading states and progress indicators
- [ ] Implement keyboard navigation and shortcuts
- [ ] Add screen reader support
- [ ] Add high contrast mode support

**Implementation Details:**
```typescript
// Keyboard shortcuts
const useKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            undo()
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 's':
            e.preventDefault()
            exportImage({ format: 'png', includeAnnotations: true })
            break
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedAnnotation) {
          deleteAnnotation(selectedAnnotation.id)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnnotation])
}

// Accessibility improvements
const AccessibilityWrapper = ({ children }) => {
  return (
    <div 
      role="application" 
      aria-label="Annotation Editor"
      tabIndex={0}
      onKeyDown={(e) => {
        // Handle keyboard navigation
        switch (e.key) {
          case 'Tab':
            // Navigate between tools
            break
          case 'Enter':
          case ' ':
            // Activate selected tool
            break
        }
      }}
      aria-describedby="editor-instructions"
    >
      <div id="editor-instructions" className="sr-only">
        Use arrow keys to navigate tools, Enter to select, and Ctrl+Z to undo, Ctrl+Y to redo.
      </div>
      {children}
    </div>
  )
}
```

### Phase 4: Advanced Features (Priority: LOW)

#### 4.1 Smart Annotations
**Tasks:**
- [ ] Add shape recognition for freehand drawings
- [ ] Implement smart snap-to-grid features
- [ ] Add measurement tools (distance, area)
- [ ] Implement annotation templates

#### 4.2 Collaboration Features
**Tasks:**
- [ ] Add real-time collaboration capabilities
- [ ] Implement annotation comments and discussions
- [ ] Add version history for annotations
- [ ] Implement sharing and export options

## Testing Strategy

### 1. Unit Tests
- Core drawing functions
- Coordinate transformations
- State management logic
- Message handling

### 2. Integration Tests
- Message flow between components
- Canvas rendering pipeline
- Export functionality
- Storage operations

### 3. E2E Tests
- Complete annotation workflow
- Cross-browser compatibility
- Performance under load
- Memory usage over time

### 4. Performance Tests
- Large image handling (10,000px+ height)
- Complex annotation scenarios (100+ annotations)
- Memory leak detection
- Render performance profiling

### 5. Accessibility Tests
- Screen reader compatibility
- Keyboard navigation
- Color contrast compliance
- Focus management

## Success Metrics

### Performance
- Render time < 16ms (60fps) for typical images
- Memory usage < 200MB for large projects
- Export time < 2 seconds for PNG output
- Startup time < 500ms

### User Experience
- Tool switching latency < 100ms
- Annotation precision within 2px
- Undo/redo response time < 50ms
- Zero crashes in 1000+ test scenarios

### Reliability
- 99.9% annotation accuracy
- Zero data loss in save/export operations
- Consistent behavior across browsers
- Graceful error recovery

## Implementation Timeline

### Week 1: Phase 1 (Critical Fixes)
- Canvas coordinate system (2 days)
- Communication flow (2 days)
- Canvas rendering optimization (3 days)

### Week 2: Phase 2 (Enhanced UX)
- Text tool improvements (2 days)
- Enhanced drawing tools (3 days)
- Advanced blur options (2 days)

### Week 3: Phase 3 (Production Features)
- Annotation management (3 days)
- Export enhancements (2 days)
- Performance & accessibility (2 days)

### Week 4: Phase 4 (Advanced Features) & Testing
- Smart annotations (2 days)
- Collaboration setup (1 day)
- Comprehensive testing & bug fixes (2 days)

## Risk Mitigation

### Technical Risks
- **Canvas performance degradation:** Implement progressive rendering and virtualization
- **Memory leaks:** Add comprehensive cleanup and monitoring
- **Cross-browser inconsistencies:** Extensive testing and polyfills

### User Experience Risks
- **Complexity creep:** Maintain simple, intuitive interface
- **Performance issues:** Continuous monitoring and optimization
- **Accessibility gaps:** Regular accessibility audits

### Timeline Risks
- **Scope expansion:** Strict adherence to MVP features
- **Technical blockers:** Parallel development paths
- **Testing delays:** Automated testing infrastructure

This comprehensive plan will transform the annotation editor into a production-ready, robust annotation engine that provides a seamless user experience with excellent performance and modern UI/UX.
