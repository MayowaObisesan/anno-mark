# Global Tool Settings Store Implementation

This document explains the global tool settings store implementation that allows you to access and persist tool properties from anywhere in your application.

## Overview

The global tool settings store provides:
- **Global Access**: Access any tool property from any file in your project
- **Automatic Persistence**: Settings are automatically saved to browser storage
- **Cross-Session Persistence**: Settings persist between browser sessions
- **Reactive Updates**: Optional event system for reacting to changes
- **Type Safety**: Full TypeScript support with comprehensive types

## Quick Start

```typescript
import { toolSettingsStore } from "~services/tool-settings-store"

// Get any tool's settings from anywhere
const textSettings = await toolSettingsStore.getToolSettings('text')
console.log(textSettings.fontSize) // 16

// Update any property (persists immediately)
await toolSettingsStore.setProperty('text', 'fontSize', 24)

// Get a specific property
const strokeColor = await toolSettingsStore.getProperty('rectangle', 'stroke')
console.log(strokeColor) // "#ff0000"
```

## Core Features

### 1. Global Property Access

You can now access any tool property from anywhere without managing state:

```typescript
// In any component or service file
import { toolSettingsStore } from "~services/tool-settings-store"

// Get current text color
const textColor = await toolSettingsStore.getProperty('text', 'stroke')

// Update rectangle stroke width
await toolSettingsStore.setProperty('rectangle', 'strokeWidth', 5)
```

### 2. Automatic Persistence

All changes are automatically saved to browser storage:

```typescript
// This immediately persists to storage
await toolSettingsStore.setProperty('text', 'fontFamily', 'Comic Sans MS')

// survives browser restarts and page reloads
```

### 3. Cross-Tool Property Sharing

Share properties between different tools:

```typescript
// Get stroke color from text tool
const textStroke = await toolSettingsStore.getProperty('text', 'stroke')

// Apply to all shape tools
await toolSettingsStore.setProperty('rectangle', 'stroke', textStroke)
await toolSettingsStore.setProperty('ellipse', 'stroke', textStroke)
await toolSettingsStore.setProperty('arrow', 'stroke', textStroke)
```

### 4. Reactive Updates (Optional)

Listen for property changes:

```typescript
toolSettingsStore.onPropertyChanged((toolType, propertyKey, newValue, oldValue) => {
  console.log(`${toolType}.${propertyKey} changed from ${oldValue} to ${newValue}`)
  
  // Trigger UI updates, analytics, etc.
  if (toolType === 'text' && propertyKey === 'fontSize') {
    updateTextPreview(newValue)
  }
})

toolSettingsStore.onToolChanged((toolType, newSettings, oldSettings) => {
  console.log(`${toolType} settings changed:`, newSettings)
})
```

### 5. Synchronous Access (Performance)

For performance-critical code, use synchronous methods:

```typescript
// Get without waiting (may be slightly stale)
const allSettings = toolSettingsStore.getSettingsSync()

// Set without waiting (saves in background)
toolSettingsStore.setPropertySync('text', 'fontSize', 18)
```

## API Reference

### Core Methods

```typescript
// Get all settings for a tool
await toolSettingsStore.getToolSettings(toolType: string): Promise<ToolPropertySettings>

// Get a specific property
await toolSettingsStore.getProperty(toolType: string, propertyKey: string): Promise<any>

// Set all settings for a tool
await toolSettingsStore.setToolSettings(toolType: string, settings: ToolPropertySettings): Promise<void>

// Set a specific property
await toolSettingsStore.setProperty(toolType: string, propertyKey: string, value: any): Promise<void>

// Get all settings for all tools
await toolSettingsStore.getAllSettings(): Promise<ToolSettings>

// Set all settings for all tools
await toolSettingsStore.setAllSettings(settings: ToolSettings): Promise<void>
```

### Utility Methods

```typescript
// Reset specific tool to defaults
await toolSettingsStore.resetToolToDefaults(toolType: string): Promise<void>

// Reset all tools to defaults
await toolSettingsStore.resetAllToDefaults(): Promise<void>

// Export settings for backup
await toolSettingsStore.exportSettings(): Promise<ToolSettings>

// Import settings from backup
await toolSettingsStore.importSettings(settings: ToolSettings): Promise<void>

// Initialize the store (called automatically)
await toolSettingsStore.initialize(): Promise<void>
```

### Event Methods

```typescript
// Listen to property changes
toolSettingsStore.onPropertyChanged(callback: PropertyChangeCallback): void

// Listen to tool changes
toolSettingsStore.onToolChanged(callback: ToolChangeCallback): void

// Remove listeners
toolSettingsStore.removePropertyChangeCallback(callback: PropertyChangeCallback): void
toolSettingsStore.removeToolChangeCallback(callback: ToolChangeCallback): void
```

### Synchronous Methods

```typescript
// Get without waiting
toolSettingsStore.getSettingsSync(): ToolSettings
toolSettingsStore.getPropertySync(toolType: string, propertyKey: string): any

// Set without waiting
toolSettingsStore.setPropertySync(toolType: string, propertyKey: string, value: any): void
```

## Integration Points

### 1. AnnotationEngine Integration

The `AnnotationEngine` class now integrates with the global store:

```typescript
// Engine automatically loads tool settings on initialization
const engine = new AnnotationEngine(canvas)

// Setting properties persists globally
await engine.setToolProperties({ stroke: '#00ff00', strokeWidth: 4 })

// Switching tools loads their respective settings
await engine.setTool('text') // Loads text tool settings
```

### 2. Toolbar Integration

The toolbar component automatically persists changes:

```typescript
// All toolbar changes persist immediately
<Toolbar engine={engine} activeTool={selectedTool} />
```

### 3. React Hook Example

```typescript
const useToolSettings = (toolType: string) => {
  const [settings, setSettings] = useState({})
  
  useEffect(() => {
    const loadSettings = async () => {
      const toolSettings = await toolSettingsStore.getToolSettings(toolType)
      setSettings(toolSettings)
    }
    
    loadSettings()
    
    toolSettingsStore.onToolChanged((changedTool, newSettings) => {
      if (changedTool === toolType) {
        setSettings(newSettings)
      }
    })
  }, [toolType])
  
  const updateSetting = async (key: string, value: any) => {
    await toolSettingsStore.setProperty(toolType, key, value)
  }
  
  return [settings, updateSetting]
}
```

## Default Settings

Each tool has default settings defined in `DEFAULT_TOOL_SETTINGS`:

```typescript
{
  text: {
    stroke: "#ff0000",
    fontSize: 16,
    fontFamily: "Arial",
    fill: "rgba(255, 0, 0, 0.22)"
  },
  rectangle: {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent"
  },
  // ... other tools
}
```

## File Structure

```
src/
├── services/
│   ├── tool-settings-store.ts     # Core store implementation
│   └── storage.ts                # Extended storage service
├── types/
│   ├── tool-settings.ts           # Type definitions
│   └── settings.ts               # Extended settings types
├── components/annotation_engine/
│   ├── AnnotationEngine.ts        # Integrated with global store
│   └── toolbar/toolbar.tsx       # Persists changes automatically
├── examples/
│   └── tool-settings-demo.ts      # Usage examples
└── TOOL_SETTINGS_README.md        # This documentation
```

## Benefits

1. **No State Management**: No need to pass props or manage local state
2. **Automatic Persistence**: Changes save immediately without extra code
3. **Global Consistency**: Same settings across all annotation instances
4. **Type Safety**: Full TypeScript support with IntelliSense
5. **Performance**: Synchronous options for critical paths
6. **Extensibility**: Easy to add new tools and properties
7. **Backward Compatibility**: Existing code continues to work

## Migration Guide

The implementation is backward compatible. Existing code will work, but you can now:

1. Access settings globally without prop drilling
2. Remove local state management for tool properties
3. Enable automatic persistence between sessions
4. Add reactive updates to your components

## Testing

See `src/examples/tool-settings-demo.ts` for comprehensive usage examples and test cases.
