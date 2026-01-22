import { storageService } from "./storage"
import type {
  ToolSettings,
  ToolPropertySettings,
  PropertyChangeCallback,
  ToolChangeCallback
} from "~types/tool-settings"
import { DEFAULT_TOOL_SETTINGS } from "~types/tool-settings"
import type { ToolType } from "~components/annotation_engine/engine/types"

class ToolSettingsStore {
  private static instance: ToolSettingsStore
  private settings: ToolSettings = { ...DEFAULT_TOOL_SETTINGS }
  private propertyChangeCallbacks: PropertyChangeCallback[] = []
  private toolChangeCallbacks: ToolChangeCallback[] = []
  private isInitialized: boolean = false

  private constructor() {}

  static getInstance(): ToolSettingsStore {
    if (!ToolSettingsStore.instance) {
      ToolSettingsStore.instance = new ToolSettingsStore()
    }
    return ToolSettingsStore.instance
  }

  /**
   * Initialize the store by loading settings from storage
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      const storedSettings = await storageService.getSetting("toolSettings")
      if (storedSettings) {
        this.settings = { ...DEFAULT_TOOL_SETTINGS, ...storedSettings }
      }
      this.isInitialized = true
    } catch (error) {
      console.error("Failed to initialize tool settings store:", error)
      this.settings = { ...DEFAULT_TOOL_SETTINGS }
      this.isInitialized = true
    }
  }

  /**
   * Get all settings for a specific tool
   */
  async getToolSettings(toolType: ToolType): Promise<ToolPropertySettings> {
    await this.ensureInitialized()
    return { ...this.settings[toolType] }
  }

  /**
   * Get a specific property for a tool
   */
  async getProperty(toolType: ToolType, propertyKey: string): Promise<any> {
    await this.ensureInitialized()
    return this.settings[toolType]?.[propertyKey]
  }

  /**
   * Set all settings for a specific tool
   */
  async setToolSettings(toolType: ToolType, settings: ToolPropertySettings): Promise<void> {
    await this.ensureInitialized()

    const oldSettings = { ...this.settings[toolType] }
    const newSettings = { ...settings }

    this.settings[toolType] = newSettings
    await this.saveToStorage()

    // Trigger callbacks
    this.toolChangeCallbacks.forEach(callback => {
      try {
        callback(toolType, newSettings, oldSettings)
      } catch (error) {
        console.error("Error in tool change callback:", error)
      }
    })
  }

  /**
   * Set a specific property for a tool
   */
  async setProperty(toolType: ToolType, propertyKey: string, value: any): Promise<void> {
    await this.ensureInitialized()

    const oldValue = this.settings[toolType]?.[propertyKey]

    // Initialize tool settings if they don't exist
    if (!this.settings[toolType]) {
      this.settings[toolType] = {}
    }

    this.settings[toolType][propertyKey] = value
    await this.saveToStorage()

    // Trigger callbacks only if value actually changed
    if (oldValue !== value) {
      this.propertyChangeCallbacks.forEach(callback => {
        try {
          callback(toolType, propertyKey, value, oldValue)
        } catch (error) {
          console.error("Error in property change callback:", error)
        }
      })
    }
  }

  /**
   * Get all settings for all tools
   */
  async getAllSettings(): Promise<ToolSettings> {
    await this.ensureInitialized()
    return JSON.parse(JSON.stringify(this.settings))
  }

  /**
   * Set all settings for all tools
   */
  async setAllSettings(settings: ToolSettings): Promise<void> {
    await this.ensureInitialized()

    const oldSettings = JSON.parse(JSON.stringify(this.settings))
    this.settings = { ...DEFAULT_TOOL_SETTINGS, ...settings }
    await this.saveToStorage()

    // Trigger callbacks for each tool that changed
    Object.keys(this.settings).forEach(toolType => {
      if (JSON.stringify(this.settings[toolType]) !== JSON.stringify(oldSettings[toolType])) {
        this.toolChangeCallbacks.forEach(callback => {
          try {
            callback(toolType, this.settings[toolType], oldSettings[toolType])
          } catch (error) {
            console.error("Error in tool change callback:", error)
          }
        })
      }
    })
  }

  /**
   * Reset a specific tool to its default settings
   */
  async resetToolToDefaults(toolType: ToolType): Promise<void> {
    await this.ensureInitialized()

    if (DEFAULT_TOOL_SETTINGS[toolType]) {
      await this.setToolSettings(toolType, DEFAULT_TOOL_SETTINGS[toolType])
    }
  }

  /**
   * Reset all tools to their default settings
   */
  async resetAllToDefaults(): Promise<void> {
    await this.ensureInitialized()
    await this.setAllSettings(DEFAULT_TOOL_SETTINGS)
  }

  /**
   * Export settings for backup/import
   */
  async exportSettings(): Promise<ToolSettings> {
    return this.getAllSettings()
  }

  /**
   * Import settings from backup
   */
  async importSettings(settings: ToolSettings): Promise<void> {
    await this.setAllSettings(settings)
  }

  /**
   * Register a callback for property changes
   */
  onPropertyChanged(callback: PropertyChangeCallback): void {
    this.propertyChangeCallbacks.push(callback)
  }

  /**
   * Register a callback for tool changes
   */
  onToolChanged(callback: ToolChangeCallback): void {
    this.toolChangeCallbacks.push(callback)
  }

  /**
   * Remove a property change callback
   */
  removePropertyChangeCallback(callback: PropertyChangeCallback): void {
    const index = this.propertyChangeCallbacks.indexOf(callback)
    if (index > -1) {
      this.propertyChangeCallbacks.splice(index, 1)
    }
  }

  /**
   * Remove a tool change callback
   */
  removeToolChangeCallback(callback: ToolChangeCallback): void {
    const index = this.toolChangeCallbacks.indexOf(callback)
    if (index > -1) {
      this.toolChangeCallbacks.splice(index, 1)
    }
  }

  /**
   * Get the current settings without waiting (for synchronous access)
   * Note: This may return stale data if the store hasn't been initialized yet
   */
  getSettingsSync(): ToolSettings {
    return JSON.parse(JSON.stringify(this.settings))
  }

  /**
   * Get a specific property without waiting (synchronous access)
   */
  getPropertySync(toolType: ToolType, propertyKey: string): any {
    return this.settings[toolType]?.[propertyKey]
  }

  /**
   * Set a specific property without waiting (synchronous access)
   * Note: This will trigger an async save but won't wait for it
   */
  setPropertySync(toolType: ToolType, propertyKey: string, value: any): void {
    const oldValue = this.settings[toolType]?.[propertyKey]

    if (!this.settings[toolType]) {
      this.settings[toolType] = {}
    }

    this.settings[toolType][propertyKey] = value

    // Async save without waiting
    this.saveToStorage().catch(error => {
      console.error("Failed to save settings:", error)
    })

    // Trigger callbacks
    if (oldValue !== value) {
      this.propertyChangeCallbacks.forEach(callback => {
        try {
          callback(toolType, propertyKey, value, oldValue)
        } catch (error) {
          console.error("Error in property change callback:", error)
        }
      })
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await storageService.setSetting("toolSettings", this.settings)
    } catch (error) {
      console.error("Failed to save tool settings to storage:", error)
      throw error
    }
  }
}

// Export singleton instance
export const toolSettingsStore = ToolSettingsStore.getInstance()
