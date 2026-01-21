I understand you want to proceed with Option 2 (Single Canvas with Preview Mode). Let me create the comprehensive implementation plan and document it in `SINGLE_CANVAS_WITH_PREVIEW.md`.

Based on our discussion, here's the implementation plan:

## Implementation Plan: Single Canvas with Real-time Preview

### Overview
Implement a real-time preview system that shows users exactly what they're drawing as they draw, with familiar WYSIWYG behavior like Microsoft Paint.

### Architecture
- **Single Canvas**: Main canvas renders background + completed annotations
- **Preview System**: Real-time preview during drawing operations
- **Tool State Management**: Each tool maintains its own preview state
- **Clean Separation**: Preview logic separate from final annotation logic

### Implementation Phases

#### Phase 1: Core Preview Infrastructure
1. **Add Preview State to AnnotationEngine**
    - `isDrawing: boolean`
    - `currentPreview: Annotation | null`
    - `drawingState: Point[]` for tool-specific data

2. **Enhance redraw() Method**
    - Render preview annotation first if drawing
    - Then render all completed annotations
    - Maintain performance with single render pass

3. **Tool Preview Updates**
    - Modify ArrowTool to track `currentPoints[]`
    - Update RectangleTool, EllipseTool, FreehandTool similarly
    - Add preview rendering logic to each tool

#### Phase 2: Tool Implementation Updates
1. **ArrowTool Enhancement**
    - Track points during drawing
    - Render preview arrow in real-time
    - Convert to final annotation on completion

2. **Shape Tools Enhancement**
    - Similar preview logic for rectangle, ellipse, freehand
    - Maintain drawing state throughout interaction

#### Phase 3: Engine Integration
1. **Drawing State Management**
    - `startDrawing()` method
    - `updatePreview()` method
    - `finishDrawing()` method
    - Event callbacks for preview updates

2. **Tool Property Integration**
    - Preview uses current tool properties
    - Clean separation between preview and final annotations

#### Phase 4: Component Integration
1. **Update AnnotationEngineComponent**
    - Add preview state tracking
    - No additional canvas layers needed
    - Enhanced UX with real-time feedback

2. **Testing & Validation**
    - Verify preview accuracy
    - Test tool state transitions
    - Performance optimization

### Benefits
✅ **Familiar User Experience**: What users expect from basic drawing tools
✅ **Real-time Feedback**: Immediate visual confirmation of actions
✅ **Simple Architecture**: Single canvas, clean implementation
✅ **Predictable Behavior**: WYSIWYG interaction model
✅ **Performance**: Efficient single rendering context

### Timeline
- **Phase 1**: 2-3 days (Core infrastructure)
- **Phase 2**: 2-3 days (Tool updates)
- **Phase 3**: 1-2 days (Engine integration)
- **Phase 4**: 1-2 days (Component integration & testing)

**Total Estimated Time**: 6-10 days

This approach will give you the familiar drawing experience you want while maintaining the clean architecture of the new engine. Should I proceed with creating this implementation plan?
