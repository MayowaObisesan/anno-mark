/**
 * Tool Settings Store Demo
 *
 * This file demonstrates how to use the global tool settings store
 * from anywhere in your application.
 */

import { toolSettingsStore } from "~services/tool-settings-store"
import type { ToolType } from "~components/annotation_engine/engine/types"
import React from "react"

// Example 1: Access tool settings from anywhere
export async function demonstrateGlobalAccess() {
  // Get text tool settings
  const textSettings = await toolSettingsStore.getToolSettings('text')
  console.log('Text tool settings:', textSettings)

  // Get a specific property
  const currentStroke = await toolSettingsStore.getProperty('rectangle', 'stroke')
  console.log('Current rectangle stroke color:', currentStroke)

  // Update a property (this persists immediately)
  await toolSettingsStore.setProperty('text', 'fontSize', 24)

  // Update multiple properties at once
  await toolSettingsStore.setToolSettings('rectangle', {
    stroke: '#00ff00',
    strokeWidth: 4,
    fill: 'rgba(0, 255, 0, 0.3)'
  })
}

// Example 2: Listen for changes
export function demonstrateReactiveUpdates() {
  toolSettingsStore.onPropertyChanged((toolType, propertyKey, newValue, oldValue) => {
    console.log(`${toolType}.${propertyKey} changed from ${oldValue} to ${newValue}`)

    // You can trigger UI updates, save to server, etc.
    if (toolType === 'text' && propertyKey === 'fontSize') {
      console.log('Font size changed - update preview!')
    }
  })

  toolSettingsStore.onToolChanged((toolType, newSettings, oldSettings) => {
    console.log(`${toolType} settings changed:`, newSettings)
  })
}

// Example 3: Reset and backup functionality
export async function demonstrateManagement() {
  // Reset specific tool to defaults
  await toolSettingsStore.resetToolToDefaults('text')

  // Reset all tools
  await toolSettingsStore.resetAllToDefaults()

  // Export settings for backup
  const backup = await toolSettingsStore.exportSettings()
  console.log('Backup settings:', JSON.stringify(backup, null, 2))

  // Import settings from backup
  await toolSettingsStore.importSettings(backup)
}

// Example 4: Synchronous access (for performance-critical code)
export function demonstrateSyncAccess() {
  // Get current settings without waiting (may be slightly stale)
  const allSettings = toolSettingsStore.getSettingsSync()
  console.log('All settings (sync):', allSettings)

  // Get specific property without waiting
  const textColor = toolSettingsStore.getPropertySync('text', 'stroke')
  console.log('Text color (sync):', textColor)

  // Set property without waiting (saves in background)
  toolSettingsStore.setPropertySync('text', 'fontSize', 18)
}

// Example 5: Cross-tool property sharing
export async function demonstrateCrossToolSharing() {
  // Get the stroke color from text tool
  const textStroke = await toolSettingsStore.getProperty('text', 'stroke')

  // Apply the same color to rectangle tool
  await toolSettingsStore.setProperty('rectangle', 'stroke', textStroke)

  // Apply to arrow tool too
  await toolSettingsStore.setProperty('arrow', 'stroke', textStroke)

  console.log('Applied text stroke color to all shape tools')
}

// Example 6: Initialize the store (call this at app startup)
export async function initializeStore() {
  await toolSettingsStore.initialize()
  console.log('Tool settings store initialized')
}

// Example usage in a React component
export const useToolSettings = (toolType: ToolType) => {
  const [settings, setSettings] = React.useState({})

  React.useEffect(() => {
    const loadSettings = async () => {
      const toolSettings = await toolSettingsStore.getToolSettings(toolType)
      setSettings(toolSettings)
    }

    loadSettings()

    // Listen for changes
    const handleChange = async () => {
      const toolSettings = await toolSettingsStore.getToolSettings(toolType)
      setSettings(toolSettings)
    }

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
