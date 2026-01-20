// import cssText from "data-text:~/contents/plasmo-overlay.css";
import cssText from "data-text:~/globals.css";
import type { PlasmoCSConfig } from "plasmo";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import { Button, Theme } from "@radix-ui/themes"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  css: ["font.css"],
  run_at: "document_start",
}

/*export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}*/

/**
 * Generates a style element with adjusted CSS to work correctly within a Shadow DOM.
 *
 * Tailwind CSS relies on `rem` units, which are based on the root font size (typically defined on the <html>
 * or <body> element). However, in a Shadow DOM (as used by Plasmo), there is no native root element, so the
 * rem values would reference the actual page's root font size—often leading to sizing inconsistencies.
 *
 * To address this, we:
 * 1. Replace the `:root` selector with `:host(plasmo-csui)` to properly scope the styles within the Shadow DOM.
 * 2. Convert all `rem` units to pixel values using a fixed base font size, ensuring consistent styling
 *    regardless of the host page's font size.
 */
export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16

  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize

    return `${pixelsValue}px`
  })

  const styleElement = document.createElement("style")

  styleElement.textContent = updatedCssText

  return styleElement
}

// Types for annotation actions
interface AnnotationAction {
  id: string
  tool: 'arrow' | 'rectangle' | 'ellipse' | 'freehand' | 'text' | 'blur'
  color: string
  size: number
  startX: number
  startY: number
  endX?: number
  endY?: number
  text?: string
  points?: { x: number; y: number }[]
}

const PlasmoOverlay = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [imageData, setImageData] = useState<string>('')
  const [imageWidth, setImageWidth] = useState<number>(0)
  const [imageHeight, setImageHeight] = useState<number>(0)
  const [selectedTool, setSelectedTool] = useState<AnnotationAction['tool']>('arrow')
  const [selectedColor, setSelectedColor] = useState<string>('#ff0000')
  const [brushSize, setBrushSize] = useState<number>(3)
  const [actions, setActions] = useState<AnnotationAction[]>([])
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentAction, setCurrentAction] = useState<AnnotationAction | null>(null)
  const [history, setHistory] = useState<AnnotationAction[][]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

  // Listen for messages from content script
  useEffect(() => {
    const handleShowOverlayEditor = (event: CustomEvent) => {
      const { dataUrl, width, height } = event.detail
      setImageData(dataUrl)
      setImageWidth(width)
      setImageHeight(height)
      setShowEditor(true)
      setActions([])
      setHistory([])
      setHistoryIndex(-1)
    }

    const handleHideOverlayEditor = () => {
      setShowEditor(false)
    }

    window.addEventListener('show-overlay-editor', handleShowOverlayEditor as EventListener)
    window.addEventListener('hide-overlay-editor', handleHideOverlayEditor)

    return () => {
      window.removeEventListener('show-overlay-editor', handleShowOverlayEditor as EventListener)
      window.removeEventListener('hide-overlay-editor', handleHideOverlayEditor)
    }
  }, [])

  // Load image onto base canvas
  useEffect(() => {
    if (imageData && baseCanvasRef.current) {
      const canvas = baseCanvasRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        canvas.width = imageWidth
        canvas.height = imageHeight
        ctx.drawImage(img, 0, 0, imageWidth, imageHeight)
        redrawActions()
      }
      img.src = imageData
    }
  }, [imageData, imageWidth, imageHeight])

  // Redraw all actions
  const redrawActions = useCallback(() => {
    if (!baseCanvasRef.current || !overlayCanvasRef.current) return

    const overlayCanvas = overlayCanvasRef.current
    const overlayCtx = overlayCanvas.getContext('2d')
    if (!overlayCtx) return

    // Clear overlay
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

    // Draw all actions on base canvas
    const baseCanvas = baseCanvasRef.current
    const baseCtx = baseCanvas.getContext('2d')
    if (!baseCtx) return

    actions.forEach(action => {
      drawAction(baseCtx, action)
    })
  }, [actions])

  // Draw a single action
  const drawAction = (ctx: CanvasRenderingContext2D, action: AnnotationAction) => {
    ctx.strokeStyle = action.color
    ctx.lineWidth = action.size
    ctx.fillStyle = action.color

    switch (action.tool) {
      case 'arrow':
        drawArrow(ctx, action.startX, action.startY, action.endX!, action.endY!)
        break
      case 'rectangle':
        ctx.strokeRect(
          Math.min(action.startX, action.endX!),
          Math.min(action.startY, action.endY!),
          Math.abs(action.endX! - action.startX),
          Math.abs(action.endY! - action.startY)
        )
        break
      case 'ellipse':
        drawEllipse(ctx, action.startX, action.startY, action.endX!, action.endY!)
        break
      case 'freehand':
        if (action.points && action.points.length > 0) {
          ctx.beginPath()
          ctx.moveTo(action.points[0].x, action.points[0].y)
          action.points.forEach(point => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
        }
        break
      case 'text':
        if (action.text) {
          ctx.font = `${action.size * 4}px Arial`
          ctx.fillText(action.text, action.startX, action.startY)
        }
        break
      case 'blur':
        // Simplified blur - draw semi-transparent rectangle
        ctx.fillStyle = 'rgba(200, 200, 200, 0.7)'
        ctx.fillRect(
          Math.min(action.startX, action.endX!),
          Math.min(action.startY, action.endY!),
          Math.abs(action.endX! - action.startX),
          Math.abs(action.endY! - action.startY)
        )
        break
    }
  }

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headLength = 15
    const angle = Math.atan2(toY - fromY, toX - fromX)

    // Draw line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Draw arrowhead
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6))
    ctx.moveTo(toX, toY)
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6))
    ctx.stroke()
  }

  const drawEllipse = (ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) => {
    const centerX = (startX + endX) / 2
    const centerY = (startY + endY) / 2
    const radiusX = Math.abs(endX - startX) / 2
    const radiusY = Math.abs(endY - startY) / 2

    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
    ctx.stroke()
  }

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e)
    setIsDrawing(true)

    const newAction: AnnotationAction = {
      id: Date.now().toString(),
      tool: selectedTool,
      color: selectedColor,
      size: brushSize,
      startX: pos.x,
      startY: pos.y,
      ...(selectedTool === 'text' ? { text: 'Sample Text' } : {}),
      ...(selectedTool === 'freehand' ? { points: [pos] } : {})
    }

    setCurrentAction(newAction)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction || !overlayCanvasRef.current) return

    const pos = getMousePos(e)
    const overlayCtx = overlayCanvasRef.current.getContext('2d')
    if (!overlayCtx) return

    // Clear overlay and redraw
    overlayCtx.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)

    let updatedAction = { ...currentAction }

    switch (selectedTool) {
      case 'arrow':
      case 'rectangle':
      case 'ellipse':
      case 'blur':
        updatedAction.endX = pos.x
        updatedAction.endY = pos.y
        break
      case 'freehand':
        updatedAction.points = [...(currentAction.points || []), pos]
        break
    }

    setCurrentAction(updatedAction)
    drawAction(overlayCtx, updatedAction)
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentAction) return

    const finalAction = { ...currentAction }

    // Handle text input
    if (selectedTool === 'text') {
      const text = prompt('Enter text:', 'Sample Text')
      if (text) {
        finalAction.text = text
        addAction(finalAction)
      }
    } else if (selectedTool !== 'freehand' || (finalAction.points && finalAction.points.length > 1)) {
      addAction(finalAction)
    }

    setIsDrawing(false)
    setCurrentAction(null)

    // Clear overlay
    if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext('2d')
      overlayCtx?.clearRect(0, 0, overlayCanvasRef.current.width, overlayCanvasRef.current.height)
    }
  }

  const addAction = (action: AnnotationAction) => {
    const newActions = [...actions, action]
    setActions(newActions)

    // Update history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newActions)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setActions(history[historyIndex - 1] || [])
      redrawActions()
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setActions(history[historyIndex + 1])
      redrawActions()
    }
  }

  const exportImage = () => {
    if (!baseCanvasRef.current) return

    // Create a temporary canvas for export
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = imageWidth
    exportCanvas.height = imageHeight
    const exportCtx = exportCanvas.getContext('2d')

    if (!exportCtx) return

    // Draw base image
    exportCtx.drawImage(baseCanvasRef.current, 0, 0)

    // Draw all actions
    actions.forEach(action => {
      drawAction(exportCtx, action)
    })

    // Download the image
    exportCanvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `annotation-${Date.now()}.png`
        a.click()
        URL.revokeObjectURL(url)
      }
    }, 'image/png')

    // Save to storage (toDataURL is synchronous)
    const dataUrl = exportCanvas.toDataURL('image/png')
    sendToBackground({
      name: 'save-annotation',
      body: { dataUrl }
    })

    // Hide editor
    setShowEditor(false)
  }

  const handleStartCapture = async () => {
    console.log('handleStartCapture called')
    setIsCapturing(true)
    console.log('handleStartCapture called step 2')

    try {
      console.log('handleStartCapture called step 3 - Inside try')
      const response = await sendToBackground({
        name: "start-capture",
        body: { useOverlay: true }
      })
      console.log('handleStartCapture called step 4 - Inside try - Called start capture')

      console.log('Start capture response:', response)

      if (response?.type === 'CAPTURE_ERROR') {
        console.error('Capture failed:', response.data.error)
        alert(`Capture failed: ${response.data.error}`)
      } else if (!response) {
        console.error('No response received from start-capture')
        alert('Failed to start capture. No response received.')
      }
    } catch (error) {
      console.error('Failed to start capture:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  const tools = [
    { value: 'arrow', label: 'Arrow' },
    { value: 'rectangle', label: 'Rectangle' },
    { value: 'ellipse', label: 'Ellipse' },
    { value: 'freehand', label: 'Freehand' },
    { value: 'text', label: 'Text' },
    { value: 'blur', label: 'Blur' }
  ]

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000', '#ffffff']

  return (
    <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%" className={"dark"}>
      {/* Floating Button */}
      <button
        className={`anno-mark-floating-button ${isCapturing ? 'capturing' : ''}`}
        onClick={handleStartCapture}
        title="Capture and Annotate"
      />

      {/* Editor Overlay */}
      {showEditor && (
        <div className="anno-mark-overlay-container">
          <Button size={'4'}>Radix Button</Button>
          <div className="hidden anno-mark-editor-wrapper">
            <div className="anno-mark-editor-header">
              <div className="anno-mark-editor-title">
                Anno-Mark Editor
              </div>
              <button
                className="anno-mark-editor-close"
                onClick={() => setShowEditor(false)}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="anno-mark-editor-content">
              {imageData ? (
                <div className="anno-mark-canvas-container">
                  <canvas
                    ref={baseCanvasRef}
                  />
                  <canvas
                    ref={overlayCanvasRef}
                    width={imageWidth}
                    height={imageHeight}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      border: '1px solid transparent',
                      maxWidth: '100%',
                      height: 'auto',
                      cursor: 'crosshair'
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>📸</div>
                  <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading capture...</div>
                </div>
              )}
            </div>

            <div className="anno-mark-toolbar">
              {/* Tool Selection */}
              <div className="anno-mark-toolbar-group">
                {tools.map(tool => (
                  <button
                    key={tool.value}
                    className={`anno-mark-tool-button ${selectedTool === tool.value ? 'active' : ''}`}
                    onClick={() => setSelectedTool(tool.value as any)}
                    title={tool.label}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>

              {/* Color Picker */}
              <div className="anno-mark-toolbar-group">
                <div className="anno-mark-color-picker">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`anno-mark-color-button ${selectedColor === color ? 'active' : ''}`}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Brush Size */}
              <div className="anno-mark-toolbar-group">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="anno-mark-size-slider"
                  title={`Size: ${brushSize}px`}
                />
                <span style={{ fontSize: '14px', color: '#6b7280', minWidth: '40px' }}>
                  {brushSize}px
                </span>
              </div>

              {/* Undo/Redo */}
              <div className="anno-mark-toolbar-group">
                <button
                  className="anno-mark-action-button secondary"
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  title="Undo"
                >
                  ↩️ Undo
                </button>
                <button
                  className="anno-mark-action-button secondary"
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo"
                >
                  ↪️ Redo
                </button>
              </div>

              {/* Export */}
              <div className="anno-mark-toolbar-group">
                <button
                  className="anno-mark-action-button primary"
                  onClick={exportImage}
                  title="Export and Save"
                >
                  💾 Save & Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Theme>
  )
}

export default PlasmoOverlay
