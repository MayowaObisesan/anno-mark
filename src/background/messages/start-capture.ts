import type { PlasmoMessaging } from "@plasmohq/messaging"
import { storageService } from "~services/storage"
import type { DocumentMetrics, CapturePlan, CaptureStep, CapturePiece, CaptureResult } from "~types/capture"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log('Start capture handler received:', req)

  const { useOverlay } = req.body

  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      console.error('No active tab found')
      return res.send({
        type: 'CAPTURE_ERROR',
        data: { error: 'No active tab found' }
      })
    }

    console.log('Got active tab:', tab.id, tab.url)

    // Get document metrics
    const metrics = await getDocumentMetrics(tab.id)
    if (!metrics) {
      throw new Error('Failed to get document metrics')
    }

    console.log('Document metrics:', metrics)

    // Determine capture method based on page analysis
    const useSnapDomPrimary = metrics.shouldUseSnapDomPrimary || false

    let result: CaptureResult
    if (useSnapDomPrimary) {
      console.log('Using SnapDom as primary capture method')
      result = await captureWithSnapDom(tab.id, metrics)
    } else {
      console.log('Using Chrome API with scrolling capture method')
      const plan = await createCapturePlan(metrics)
      result = await executeCaptureWithChromeApi(tab.id, plan, metrics)
    }

    console.log('Capture completed, result:', {
      width: result.width,
      height: result.height,
      method: result.captureMethod,
      duration: result.duration
    })

    // Check if we should use overlay editor
    if (useOverlay) {
      console.log('Showing overlay editor')
      await showOverlayEditor(tab.id, result)
    } else {
      console.log('Opening editor in new tab')
      await openEditor(tab.id, result)
    }

    // Save capture metadata (without image data to avoid quota issues)
    await storageService.saveLastCaptureMetadata({
      width: result.width,
      height: result.height,
      timestamp: Date.now(),
      url: tab.url || '',
      title: tab.title || ''
    })

    res.send({
      type: 'CAPTURE_COMPLETE',
      data: {
        dataUrl: result.dataUrl,
        width: result.width,
        height: result.height
      }
    })

  } catch (error) {
    console.error('Capture failed:', error)
    res.send({
      type: 'CAPTURE_ERROR',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        fallbackUsed: false
      }
    })
  }
}

// Helper functions
async function getDocumentMetrics(tabId: number): Promise<DocumentMetrics | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_DOCUMENT_METRICS'
    })

    if (response?.type === 'DOCUMENT_METRICS_RESPONSE') {
      const data = response.data
      return {
        scrollHeight: data.scrollHeight,
        scrollWidth: data.scrollWidth,
        viewportHeight: data.viewportHeight,
        viewportWidth: data.viewportWidth,
        devicePixelRatio: data.devicePixelRatio,
        scrollY: data.scrollY,
        shouldUseSnapDomPrimary: data.shouldUseSnapDomPrimary || false
      }
    }
    return null
  } catch (error) {
    console.error('getDocumentMetrics failed:', error)
    return null
  }
}

async function createCapturePlan(metrics: DocumentMetrics): Promise<CapturePlan> {
  const settings = await storageService.getSetting('capture')
  const overlap = settings.overlap || 30
  const viewportHeight = metrics.viewportHeight
  const scrollHeight = metrics.scrollHeight

  const steps: CaptureStep[] = []
  let currentY = 0

  while (currentY < scrollHeight) {
    const stepHeight = Math.min(viewportHeight, scrollHeight - currentY)
    steps.push({
      x: 0,
      y: currentY,
      offsetY: currentY * metrics.devicePixelRatio,
      viewportWidth: metrics.viewportWidth,
      viewportHeight: stepHeight
    })
    currentY += viewportHeight - overlap
  }

  return {
    totalHeight: scrollHeight,
    totalWidth: metrics.scrollWidth,
    steps,
    overlap
  }
}

async function captureWithSnapDom(tabId: number, metrics: DocumentMetrics): Promise<CaptureResult> {
  const startTime = Date.now()
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CAPTURE_SLICE_FALLBACK',
      data: {
        x: 0,
        y: 0,
        width: metrics.scrollWidth,
        height: metrics.scrollHeight
      }
    })

    if (response?.type === 'CAPTURE_SLICE_FALLBACK_RESPONSE') {
      return {
        dataUrl: response.data.dataUrl,
        width: metrics.scrollWidth * metrics.devicePixelRatio,
        height: metrics.scrollHeight * metrics.devicePixelRatio,
        pieceCount: 1,
        fallbackUsed: false,
        duration: Date.now() - startTime,
        captureMethod: 'snapdom'
      }
    }
    throw new Error('SnapDom capture failed')
  } catch (error) {
    console.error('SnapDom capture failed, falling back to Chrome API:', error)
    const plan = await createCapturePlan(metrics)
    return executeCaptureWithChromeApi(tabId, plan, metrics)
  }
}

async function executeCaptureWithChromeApi(tabId: number, plan: CapturePlan, metrics: DocumentMetrics): Promise<CaptureResult> {
  const startTime = Date.now()
  const pieces: CapturePiece[] = []
  const settings = await storageService.getSetting('capture')

  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i]
    console.log(`Capturing step ${i + 1}/${plan.steps.length}`)

    await chrome.tabs.sendMessage(tabId, {
      type: 'SCROLL_TO_POSITION',
      data: { x: step.x, y: step.y }
    })

    await delay(settings.delay || 120)

    const piece = await captureSlice(tabId, step)
    if (piece) {
      pieces.push(piece)
    }
  }

  const stitchedDataUrl = await stitchImages(pieces, plan, metrics)

  return {
    dataUrl: stitchedDataUrl,
    width: plan.totalWidth * metrics.devicePixelRatio,
    height: plan.totalHeight * metrics.devicePixelRatio,
    pieceCount: pieces.length,
    fallbackUsed: true,
    duration: Date.now() - startTime,
    captureMethod: 'chrome-api'
  }
}

async function captureSlice(tabId: number, step: CaptureStep): Promise<CapturePiece | null> {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab()
    return {
      dataUrl,
      offsetY: step.offsetY,
      width: step.viewportWidth,
      height: step.viewportHeight
    }
  } catch (error) {
    console.warn('Chrome capture failed, falling back to SnapDom:', error)
    return captureSliceFallback(tabId, step)
  }
}

async function captureSliceFallback(tabId: number, step: CaptureStep): Promise<CapturePiece | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'CAPTURE_SLICE_FALLBACK',
      data: {
        x: step.x,
        y: step.y,
        width: step.viewportWidth,
        height: step.viewportHeight
      }
    })

    if (response?.type === 'CAPTURE_SLICE_FALLBACK_RESPONSE') {
      return {
        dataUrl: response.data.dataUrl,
        offsetY: step.offsetY,
        width: step.viewportWidth,
        height: step.viewportHeight
      }
    }
    return null
  } catch (fallbackError) {
    console.error('SnapDom fallback also failed:', fallbackError)
    return null
  }
}

async function stitchImages(pieces: CapturePiece[], plan: CapturePlan, metrics: DocumentMetrics): Promise<string> {
  try {
    return await stitchWithOffscreenCanvas(pieces, plan, metrics)
  } catch (error) {
    console.warn('OffscreenCanvas failed, falling back to regular canvas:', error)
    return await stitchWithRegularCanvas(pieces, plan, metrics)
  }
}

async function stitchWithOffscreenCanvas(pieces: CapturePiece[], plan: CapturePlan, metrics: DocumentMetrics): Promise<string> {
  const canvas = new OffscreenCanvas(
    plan.totalWidth * metrics.devicePixelRatio,
    plan.totalHeight * metrics.devicePixelRatio
  )

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get OffscreenCanvas context')

  for (const piece of pieces) {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = piece.dataUrl
    })

    ctx.drawImage(img, 0, piece.offsetY, piece.width * metrics.devicePixelRatio, piece.height * metrics.devicePixelRatio)
  }

  const blob = await canvas.convertToBlob({ type: 'image/png' })
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

async function stitchWithRegularCanvas(pieces: CapturePiece[], plan: CapturePlan, metrics: DocumentMetrics): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = plan.totalWidth * metrics.devicePixelRatio
  canvas.height = plan.totalHeight * metrics.devicePixelRatio

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get regular canvas context')

  for (const piece of pieces) {
    const img = new Image()
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
      img.src = piece.dataUrl
    })

    ctx.drawImage(img, 0, piece.offsetY, piece.width * metrics.devicePixelRatio, piece.height * metrics.devicePixelRatio)
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      } else {
        throw new Error('Failed to convert canvas to blob')
      }
    }, 'image/png')
  })
}

async function showOverlayEditor(tabId: number, result: CaptureResult): Promise<void> {
  await chrome.tabs.sendMessage(tabId, {
    type: 'SHOW_OVERLAY_EDITOR',
    data: {
      dataUrl: result.dataUrl,
      width: result.width,
      height: result.height
    }
  })
}

async function openEditor(tabId: number, result: CaptureResult): Promise<void> {
  const editorUrl = chrome.runtime.getURL('tabs/editor.html') +
    `?data=${encodeURIComponent(result.dataUrl)}&width=${result.width}&height=${result.height}`
  await chrome.tabs.create({ url: editorUrl })
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default handler
