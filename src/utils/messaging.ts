import type { ExtensionMessage } from "~types/messages"

/**
 * Send a message to the background script
 */
export async function sendMessageToBackground<T extends ExtensionMessage>(
  message: T
): Promise<ExtensionMessage | null> {
  try {
    const response = await chrome.runtime.sendMessage(message)
    return response
  } catch (error) {
    console.error('Failed to send message to background:', error)
    return null
  }
}

/**
 * Send a message to a specific tab
 */
export async function sendMessageToTab<T extends ExtensionMessage>(
  tabId: number,
  message: T
): Promise<ExtensionMessage | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message)
    return response
  } catch (error) {
    console.error('Failed to send message to tab:', error)
    return null
  }
}

/**
 * Send a message to the content script in the active tab
 */
export async function sendMessageToActiveTab<T extends ExtensionMessage>(
  message: T
): Promise<ExtensionMessage | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      throw new Error('No active tab found')
    }
    return await sendMessageToTab(tab.id, message)
  } catch (error) {
    console.error('Failed to send message to active tab:', error)
    return null
  }
}

/**
 * Execute a script in the active tab
 */
export async function executeScriptInActiveTab<T>(
  func: () => T
): Promise<T | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      throw new Error('No active tab found')
    }

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func
    })

    return result?.result || null
  } catch (error) {
    console.error('Failed to execute script in active tab:', error)
    return null
  }
}

/**
 * Set up a message listener for the background script
 */
export function setupBackgroundMessageHandler(
  handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: ExtensionMessage) => void) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler)
}

/**
 * Set up a message listener for content scripts
 */
export function setupContentScriptMessageHandler(
  handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: ExtensionMessage) => void) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler)
}

/**
 * Create a promise-based message handler
 */
export function createMessageHandler<T extends ExtensionMessage>(
  expectedType: T['type']
): Promise<T> {
  return new Promise((resolve, reject) => {
    const listener = (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => {
      if (message.type === expectedType) {
        chrome.runtime.onMessage.removeListener(listener)
        resolve(message as T)
      }
    }

    chrome.runtime.onMessage.addListener(listener)

    // Timeout after 30 seconds
    setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener)
      reject(new Error(`Message handler timed out waiting for ${expectedType}`))
    }, 30000)
  })
}

/**
 * Send a message and wait for a specific response type
 */
export async function sendMessageAndWaitForResponse<
  T extends ExtensionMessage,
  R extends ExtensionMessage
>(
  message: T,
  responseType: R['type']
): Promise<R> {
  const responsePromise = createMessageHandler<R>(responseType)

  const sent = await sendMessageToBackground(message)
  if (!sent) {
    throw new Error('Failed to send message')
  }

  return responsePromise
}
