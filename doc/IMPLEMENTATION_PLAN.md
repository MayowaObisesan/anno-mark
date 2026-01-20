# Floating Annotation Button Implementation Plan

## Overview
Implement a floating annotation button that appears on all web pages in the top-right corner, triggers screenshot capture when clicked, and displays an annotation editor overlay on top of the current page.

## Key Changes

### 1. src/types/messages.ts
Add new message types for communication between the floating button, background script, and content script:
- `ShowEditorOverlayMessage`: Sent from background to content script to display the editor overlay
- `HideEditorOverlayMessage`: Sent from background to content script to hide the editor overlay
- `EditorOverlayCompleteMessage`: Sent from content script to background when annotations are complete

### 2. src/contents/plasmo-overlay.tsx
Create the floating button component:
- Replace the current static text with a button that triggers capture
- Add state management for showing/hiding the editor overlay
- Implement message handlers for communication with background
- Render the editor component when overlay is visible

### 3. src/contents/plasmo-overlay.css
Style the floating button and editor overlay:
- Position the button in the top-right corner with fixed positioning
- Style the editor overlay to cover the entire viewport
- Add animations and transitions for smooth user experience
- Ensure the button has z-index to appear above other content

### 4. src/background.ts
Enhance the background script to handle overlay scenarios:
- Modify `handleStartCapture` to send `ShowEditorOverlayMessage` instead of opening a new tab
- Add message handlers for new overlay-related messages
- Implement fallback logic if overlay fails to display

### 5. src/tabs/editor.tsx
Adapt the editor for overlay use:
- Remove URL parameter parsing since data will come from props
- Modify export functionality to send data back to background instead of downloading
- Add a "Done" button to close the overlay and save annotations
- Make the editor responsive to fit within the overlay

## Implementation Steps

1. Update message types in `src/types/messages.ts`
2. Create the floating button component in `src/contents/plasmo-overlay.tsx`
3. Style the button and overlay in `src/contents/plasmo-overlay.css`
4. Modify background script in `src/background.ts`
5. Adapt editor for overlay use in `src/tabs/editor.tsx`
6. Test the implementation across different web pages

## Design Decisions

- **Floating Button Position**: Top-right corner (16px from top and right) for minimal intrusion
- **Editor Overlay**: Full viewport overlay with semi-transparent background
- **Capture Trigger**: Clicking the button triggers the existing full-page capture mechanism
- **Annotation Tools**: All existing tools (arrow, rectangle, ellipse, freehand, text, blur) will be available
- **Auto-save**: Annotations are saved automatically when done button is clicked
- **Fallback**: If overlay fails, open editor in new tab as before

## Files to Modify
- src/types/messages.ts
- src/contents/plasmo-overlay.tsx
- src/contents/plasmo-overlay.css
- src/background.ts
- src/tabs/editor.tsx
