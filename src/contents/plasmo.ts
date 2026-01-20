import { snapdom } from "@zumer/snapdom";
import type { PlasmoCSConfig } from "plasmo"

import type {
  CaptureSliceFallbackMessage,
  CaptureSliceFallbackResponse,
  DocumentMetricsResponse,
  ExtensionMessage,
  GetDocumentMetricsMessage,
  ScrollCompleteMessage,
  ScrollToPositionMessage,
  ShowOverlayEditorMessage
} from "~types/messages"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: false
}

/**
 * Set up a message listener for content scripts
 */
function setupContentScriptMessageHandler(
  handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender, sendResponse: (response?: ExtensionMessage) => void) => boolean | void
): void {
  chrome.runtime.onMessage.addListener(handler)
}

/**
 * Get document metrics for capture planning
 */
function getDocumentMetrics(): DocumentMetricsResponse['data'] {
  const documentElement = document.documentElement
  const body = document.body

  return {
    scrollHeight: Math.max(
      documentElement?.scrollHeight || 0,
      body?.scrollHeight || 0,
      documentElement?.clientHeight || 0
    ),
    scrollWidth: Math.max(
      documentElement?.scrollWidth || 0,
      body?.scrollWidth || 0,
      documentElement?.clientWidth || 0
    ),
    viewportHeight: window.innerHeight,
    viewportWidth: window.innerWidth,
    devicePixelRatio: window.devicePixelRatio || 1,
    scrollY: window.scrollY
  }
}

/**
 * Scroll to a specific position
 */
function scrollToPosition(x: number, y: number): void {
  window.scrollTo(x, y)
}

/**
 * Wait for scroll to settle and layout to stabilize
 */
function waitForScrollSettle(): Promise<void> {
  return new Promise((resolve) => {
    let lastScrollY = window.scrollY
    let scrollCheckCount = 0
    const maxChecks = 10

    const checkScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY === lastScrollY) {
        scrollCheckCount++

        if (scrollCheckCount >= 3) {
          // Scroll has settled, wait a bit more for layout
          setTimeout(resolve, 50)
          return
        }
      } else {
        scrollCheckCount = 0
        lastScrollY = currentScrollY
      }

      if (scrollCheckCount < maxChecks) {
        requestAnimationFrame(checkScroll)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(checkScroll)
  })
}

/**
 * Capture a slice using SnapDom as fallback
 */
async function captureSliceWithSnapDom(options: {
  x: number
  y: number
  width: number
  height: number
}): Promise<string> {
  try {
    const dataUrl = await snapdom(document.body, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      scale: window.devicePixelRatio || 1
    })

    return dataUrl
  } catch (error) {
    console.error('SnapDom capture failed:', error)
    throw error
  }
}

/**
 * Determine if SnapDom should be used as primary capture method
 */
function shouldUseSnapDomPrimary(metrics: DocumentMetricsResponse['data']): boolean {
  // Use SnapDom for:
  return (
    // 1. Chrome internal pages
    window.location.protocol === 'chrome:' ||
    window.location.protocol === 'chrome-extension:' ||
    // 2. PDF viewers
    document.contentType === 'application/pdf' ||
    // 3. Short pages where scrolling overhead isn't worth it
    metrics.scrollHeight <= metrics.viewportHeight * 2 ||
    // 4. Pages with complex CSS that Chrome API struggles with
    hasComplexLayout() ||
    // 5. Pages with heavy custom fonts
    hasCustomFonts()
  )
}

/**
 * Check if page has sticky elements that might interfere with capture
 */
function detectStickyElements(): boolean {
  const elements = document.querySelectorAll('*')
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement
    const style = window.getComputedStyle(element)
    const position = style.position

    if (position === 'sticky' || position === 'fixed') {
      const rect = element.getBoundingClientRect()
      // Check if element is visible and likely to interfere
      if (rect.width > 50 && rect.height > 20) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if page has complex CSS layouts
 */
function hasComplexLayout(): boolean {
  const elements = document.querySelectorAll('*')
  for (let i = 0; i < elements.length; i++) {
    const element = elements[i] as HTMLElement
    const style = window.getComputedStyle(element)

    // Check for complex CSS features
    if (
      style.display === 'grid' ||
      style.display === 'flex' ||
      style.transform !== 'none' ||
      style.filter !== 'none' ||
      style.backdropFilter !== 'none'
    ) {
      return true
    }
  }
  return false
}

/**
 * Check if page uses custom fonts
 */
function hasCustomFonts(): boolean {
  const computedStyle = window.getComputedStyle(document.body)
  const fontFamily = computedStyle.fontFamily

  // Check for non-system fonts
  const systemFonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Times', 'Courier New', 'Courier',
    'Georgia', 'Verdana', 'Geneva', 'system-ui', '-apple-system', 'BlinkMacSystemFont'
  ]

  return !systemFonts.some(font => fontFamily.includes(font))
}

/**
 * Check if page is scrollable (has content beyond viewport)
 */
function isPageScrollable(): boolean {
  const metrics = getDocumentMetrics()
  return metrics.scrollHeight > metrics.viewportHeight ||
         metrics.scrollWidth > metrics.viewportWidth
}

// Set up message handler for content script
setupContentScriptMessageHandler((message, sender, sendResponse) => {
  console.log('Content script received message:', message.type)

  switch (message.type) {
    case 'GET_DOCUMENT_METRICS': {
      const metrics = getDocumentMetrics()
      const response: DocumentMetricsResponse = {
        type: 'DOCUMENT_METRICS_RESPONSE',
        data: {
          ...metrics,
          shouldUseSnapDomPrimary: shouldUseSnapDomPrimary(metrics)
        }
      }
      sendResponse(response)
      break
    }

    case 'SCROLL_TO_POSITION': {
      const scrollMessage = message as ScrollToPositionMessage
      scrollToPosition(scrollMessage.data.x, scrollMessage.data.y)

      // Wait for scroll to complete and settle
      waitForScrollSettle().then(() => {
        const response: ScrollCompleteMessage = {
          type: 'SCROLL_COMPLETE'
        }
        sendResponse(response)
      }).catch(error => {
        console.error('Scroll settle failed:', error)
        const response: ScrollCompleteMessage = {
          type: 'SCROLL_COMPLETE'
        }
        sendResponse(response)
      })

      return true // Keep message channel open for async response
    }

    case 'CAPTURE_SLICE_FALLBACK': {
      const fallbackMessage = message as CaptureSliceFallbackMessage

      const handleFallback = async () => {
        try {
          const dataUrl = await captureSliceWithSnapDom({
            x: fallbackMessage.data.x,
            y: fallbackMessage.data.y,
            width: fallbackMessage.data.width,
            height: fallbackMessage.data.height
          })

          const response: CaptureSliceFallbackResponse = {
            type: 'CAPTURE_SLICE_FALLBACK_RESPONSE',
            data: { dataUrl }
          }
          sendResponse(response)
        } catch (error) {
          console.error('SnapDom fallback failed:', error)
          sendResponse({
            type: 'CAPTURE_SLICE_FALLBACK_RESPONSE',
            data: { dataUrl: '' }
          })
        }
      }

      handleFallback().catch(error => {
        console.error('Handler error:', error)
      })
      return true // Keep message channel open for async response
    }

    case 'SHOW_OVERLAY_EDITOR': {
      const showMessage = message as ShowOverlayEditorMessage
      // Send message to the overlay component
      const event = new CustomEvent('show-overlay-editor', {
        detail: showMessage.data
      })
      window.dispatchEvent(event)
      sendResponse({ type: 'OVERLAY_EDITOR_SHOWN' })
      break
    }

    case 'HIDE_OVERLAY_EDITOR': {
      const event = new CustomEvent('hide-overlay-editor')
      window.dispatchEvent(event)
      sendResponse({ type: 'OVERLAY_EDITOR_HIDDEN' })
      break
    }

    default:
      console.warn('Unknown message type in content script:', message.type)
      return false
  }
})

// Initialize content script
console.log('Anno-Mark content script loaded')

// Log some useful debugging information
const metrics = getDocumentMetrics()
const hasStickyElements = detectStickyElements()
const isScrollable = isPageScrollable()
const useSnapDomPrimary = shouldUseSnapDomPrimary(metrics)

console.log('Page info:', {
  url: window.location.href,
  scrollHeight: metrics.scrollHeight,
  viewportHeight: metrics.viewportHeight,
  devicePixelRatio: metrics.devicePixelRatio,
  hasStickyElements,
  isScrollable,
  useSnapDomPrimary,
  hasComplexLayout: hasComplexLayout(),
  hasCustomFonts: hasCustomFonts()
})
