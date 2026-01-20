import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Button, Flex, Text, Theme, SegmentedControl, Separator } from "@radix-ui/themes"
import '../globals.css'

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

interface EditorProps {
  data?: string
  width?: number
  height?: number
}

const Editor: React.FC<EditorProps> = () => {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
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

  // Parse URL parameters on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const data = urlParams.get('data')
    const width = urlParams.get('width')
    const height = urlParams.get('height')

    if (data && width && height) {
      setImageData(data)
      setImageWidth(parseInt(width))
      setImageHeight(parseInt(height))
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

  if (!imageData) {
    return (
      <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%" className="dark">
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Text size="4">Loading image...</Text>
        </div>
      </Theme>
    )
  }

  return (
    <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%" className="dark">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: 12,
          borderBottom: '1px solid var(--gray-6)',
          backgroundColor: 'var(--color-panel-solid)'
        }}>
          {/* Tool Selection */}
          <SegmentedControl.Root value={selectedTool} onValueChange={(value) => setSelectedTool(value as any)}>
            {tools.map(tool => (
              <SegmentedControl.Item key={tool.value} value={tool.value}>
                {tool.label}
              </SegmentedControl.Item>
            ))}
          </SegmentedControl.Root>

          <Separator orientation="vertical" size="2" />

          {/* Color Picker */}
          <div style={{ display: 'flex', gap: 4 }}>
            {colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: color,
                  border: selectedColor === color ? '2px solid var(--accent-9)' : '1px solid var(--gray-6)',
                  borderRadius: 4,
                  cursor: 'pointer'
                }}
              />
            ))}
          </div>

          <Separator orientation="vertical" size="2" />

          {/* Brush Size */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text size="2">Size:</Text>
            <input
              type="range"
              min="1"
              max="10"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{ width: 80 }}
            />
            <Text size="2">{brushSize}px</Text>
          </div>

          <Separator orientation="vertical" size="2" />

          {/* Undo/Redo */}
          <Button size="1" variant="soft" onClick={undo} disabled={historyIndex <= 0}>
            Undo
          </Button>
          <Button size="1" variant="soft" onClick={redo} disabled={historyIndex >= history.length - 1}>
            Redo
          </Button>

          <Separator orientation="vertical" size="2" />

          {/* Export */}
          <Button size="1" onClick={exportImage}>
            Export PNG
          </Button>
        </div>

        {/* Canvas Container */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: 'var(--color-background)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: 20
        }}>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={baseCanvasRef}
              style={{
                border: '1px solid var(--gray-6)',
                maxWidth: '100%',
                height: 'auto'
              }}
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
        </div>
      </div>
    </Theme>
  )
}

export default Editor
