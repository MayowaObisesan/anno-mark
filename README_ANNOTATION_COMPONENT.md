# Annotation Editor Component

A standalone, reusable image annotation component built with React and TypeScript. This component allows users to annotate images with various tools including arrows, rectangles, ellipses, freehand drawing, text, and blur effects.

## Features

- **Multiple Annotation Tools**: 
  - Arrow
  - Rectangle
  - Ellipse
  - Freehand drawing
  - Text
  - Blur (for redaction)

- **Customization Options**:
  - Adjustable brush size
  - Color selection (8 predefined colors)
  - Undo/Redo functionality
  - Export annotated images as PNG
  - Customizable UI text and behavior

- **Reusable Architecture**:
  - Standalone component with no external dependencies on extension-specific code
  - TypeScript support
  - Works in any React project
  - Can be embedded in extensions, web apps, or other projects

## Installation

To use this component in your project, you'll need to install the required dependencies:

```bash
npm install react react-dom lucide-react @radix-ui/themes
```

## Usage

### Basic Example

```tsx
import React from 'react'
import AnnotationEditorCore from './AnnotationEditorCore'

const App = () => {
  const handleExport = (dataUrl: string) => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `annotated-image-${Date.now()}.png`
    a.click()
  }

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <AnnotationEditorCore
        imageData="data:image/png;base64,..."
        width={800}
        height={600}
        onExport={handleExport}
        onClose={() => console.log('Editor closed')}
        exportButtonText="Save Annotation"
        showCloseButton={true}
      />
    </div>
  )
}

export default App
```

## Props

| Prop Name | Type | Description | Default |
|-----------|------|-------------|---------|
| `imageData` | `string` | The base image to annotate (data URL) | Required |
| `width` | `number` | Image width in pixels | Required |
| `height` | `number` | Image height in pixels | Required |
| `onExport` | `(dataUrl: string) => void` | Callback when image is exported | Optional |
| `onClose` | `() => void` | Callback when editor is closed | Optional |
| `exportButtonText` | `string` | Custom text for the export button | "Export" |
| `showCloseButton` | `boolean` | Whether to show a close button | `false` |
| `className` | `string` | Additional CSS class for the container | "" |

## Project Integration

### Integrating into a Chrome Extension

```tsx
import React from 'react'
import AnnotationEditorCore from '~components/AnnotationEditorCore'

const OverlayEditor = () => {
  const handleExport = (dataUrl: string) => {
    chrome.runtime.sendMessage({
      type: 'SAVE_ANNOTATION',
      data: dataUrl
    })
  }

  return (
    <AnnotationEditorCore
      imageData={imageData}
      width={width}
      height={height}
      onExport={handleExport}
      onClose={() => console.log('Editor closed')}
      exportButtonText="Save & Export"
      showCloseButton={true}
    />
  )
}

export default OverlayEditor
```

## Architecture

### Component Structure

The AnnotationEditorCore component follows a modular architecture:

```
AnnotationEditorCore
├── Canvas Layer (base image + annotations)
├── Overlay Canvas (live drawing preview)
├── Toolbar (tool selection, color picker, size slider)
└── History Manager (undo/redo functionality)
```

### Drawing Engine

The component uses Canvas API for drawing operations:

- **Two-Canvas System**: Base canvas for committed actions + overlay for live preview
- **Action Queue**: All annotations are stored as action objects
- **History Stack**: Manages undo/redo operations
- **Export Pipeline**: Composes final image from base + annotations

## License

MIT License - feel free to use this component in your projects.
