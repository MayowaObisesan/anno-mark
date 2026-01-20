import { Storage } from "@plasmohq/storage"
import { DEFAULT_SETTINGS, type AppSettings } from "~types/settings"

const storage = new Storage({
  area: "local"
})

export interface StoredCapture {
  dataUrl: string
  width: number
  height: number
  timestamp: number
  url: string
  title: string
}

class StorageService {
  /**
   * Get app settings from storage, returning defaults if not found
   */
  async getSettings(): Promise<AppSettings> {
    try {
      const settings = await storage.get<AppSettings>("settings")
      return settings || DEFAULT_SETTINGS
    } catch (error) {
      console.error('Failed to get settings:', error)
      return DEFAULT_SETTINGS
    }
  }

  /**
   * Save app settings to storage
   */
  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings()
      const updatedSettings = { ...currentSettings, ...settings }
      await storage.set("settings", updatedSettings)
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  /**
   * Get a specific setting value
   */
  async getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.getSettings()
    return settings[key]
  }

  /**
   * Set a specific setting value
   */
  async setSetting<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ): Promise<void> {
    await this.saveSettings({ [key]: value })
  }

  /**
   * Save the last capture metadata to storage (without image data to avoid quota issues)
   */
  async saveLastCaptureMetadata(capture: Omit<StoredCapture, 'dataUrl'>): Promise<void> {
    try {
      await storage.set("last-capture-metadata", capture)
    } catch (error) {
      console.error('Failed to save last capture metadata:', error)
      throw error
    }
  }

  /**
   * Get the last capture metadata from storage
   */
  async getLastCaptureMetadata(): Promise<Omit<StoredCapture, 'dataUrl'> | null> {
    try {
      return await storage.get<Omit<StoredCapture, 'dataUrl'>>("last-capture-metadata")
    } catch (error) {
      console.error('Failed to get last capture metadata:', error)
      return null
    }
  }

  /**
   * Clear all stored data (useful for testing or reset)
   */
  async clearAll(): Promise<void> {
    try {
      await storage.clear()
    } catch (error) {
      console.error('Failed to clear storage:', error)
      throw error
    }
  }
}

export const storageService = new StorageService()
