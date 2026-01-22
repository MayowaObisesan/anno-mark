// Tool Settings Types for Global Store

export interface ToolSettings {
  [toolType: string]: ToolPropertySettings
}

export interface ToolPropertySettings {
  [propertyKey: string]: any
}

// Default tool settings based on current implementation
export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
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
  ellipse: {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent"
  },
  arrow: {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent"
  },
  freehand: {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent"
  }
}

// Event callback types for reactive updates
export type PropertyChangeCallback = (
  toolType: string,
  propertyKey: string,
  newValue: any,
  oldValue: any
) => void

export type ToolChangeCallback = (
  toolType: string,
  newSettings: ToolPropertySettings,
  oldSettings: ToolPropertySettings
) => void
