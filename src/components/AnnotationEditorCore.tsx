import { Button, Flex, SegmentedControl, Separator, Slider, Text } from "@radix-ui/themes";
import { LucideRedo, LucideSave, LucideUndo, LucideX } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import type {
  AnnotationAction,
  AnnotationEditorProps
} from "~types/annotations"

// Enhanced text annotation interface
interface TextAnnotation extends AnnotationAction {
  text: string
  fontSize: number
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  backgroundColor?: string
  borderWidth?: number
  borderColor?: string
}

// Blur options interface
interface BlurOptions {
  type: 'gaussian' | 'motion' | 'pixelate'
  intensity: number
  direction?: 'horizontal' | 'vertical' // for motion blur
}

const AnnotationEditorCore: React.FC<AnnotationEditorProps> = ({
  imageData,
  width,
  height,
  onExport,
  onClose,
  exportButtonText = "Export",
  showCloseButton = false,
  className = ""
}) => {
  const [selectedTool, setSelectedTool] =
    useState<AnnotationAction["tool"]>("arrow")
  const [selectedColor, setSelectedColor] = useState<string>("#ff0000")
  const [brushSize, setBrushSize] = useState<number>(3)
  const [actions, setActions] = useState<AnnotationAction[]>([])
  const [isDrawing, setIsDrawing] = useState<boolean>(false)
  const [currentAction, setCurrentAction] = useState<AnnotationAction | null>(
    null
  )
  const [history, setHistory] = useState<AnnotationAction[][]>([[]])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Enhanced text tool state
  const [textInputVisible, setTextInputVisible] = useState(false)
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0 })
  const [textInputValue, setTextInputValue] = useState("")
  const [fontSize, setFontSize] = useState<number>(16)
  const [fontFamily, setFontFamily] = useState<string>("Arial")
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>("left")
  const textInputRef = useRef<HTMLInputElement>(null)

  // Enhanced blur tool state
  const [blurType, setBlurType] = useState<BlurOptions['type']>('gaussian')
  const [blurIntensity, setBlurIntensity] = useState<number>(5)
  const [blurDirection, setBlurDirection] = useState<BlurOptions['direction']>('horizontal')

  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImageRef = useRef<HTMLImageElement | null>(null)

  // Enhanced coordinate transformation with scroll and zoom handling
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    // Account for page scroll
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    }
  }

  // Load image onto base canvas
  useEffect(() => {
    if (imageData && baseCanvasRef.current) {
      const canvas = baseCanvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      const img = new Image()
      img.onload = () => {
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        originalImageRef.current = img
        redrawActions()
      }
      img.src = imageData
    }
  }, [imageData, width, height])

  // Optimized redraw function with requestAnimationFrame
  const redrawActions = useCallback(() => {
    if (!baseCanvasRef.current || !overlayCanvasRef.current || !originalImageRef.current) return

    const startTime = performance.now()

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      const overlayCanvas = overlayCanvasRef.current!
      const overlayCtx = overlayCanvas.getContext("2d")
      if (!overlayCtx) return

      // Clear overlay
      overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

      // Redraw original image on base canvas first
      const baseCanvas = baseCanvasRef.current!
      const baseCtx = baseCanvas.getContext("2d")
      if (!baseCtx) return

      baseCtx.clearRect(0, 0, baseCanvas.width, baseCanvas.height)
      baseCtx.drawImage(originalImageRef.current!, 0, 0, width, height)

      // Draw all actions
      actions.forEach((action) => {
        drawAction(baseCtx, action)
      })

      // Performance logging
      const renderTime = performance.now() - startTime
      if (renderTime > 16) { // More than 60fps
        console.warn(`Slow render detected: ${renderTime}ms`)
      }
    })
  }, [actions, width, height])

  // Enhanced draw action with text styling and blur support
  const drawAction = (
    ctx: CanvasRenderingContext2D,
    action: AnnotationAction
  ) => {
    ctx.strokeStyle = action.color
    ctx.lineWidth = action.size
    ctx.fillStyle = action.color

    switch (action.tool) {
      case "arrow":
        drawArrow(ctx, action.startX, action.startY, action.endX!, action.endY!)
        break
      case "rectangle":
        ctx.strokeRect(
          Math.min(action.startX, action.endX!),
          Math.min(action.startY, action.endY!),
          Math.abs(action.endX! - action.startX),
          Math.abs(action.endY! - action.startY)
        )
        break
      case "ellipse":
        drawEllipse(
          ctx,
          action.startX,
          action.startY,
          action.endX!,
          action.endY!
        )
        break
      case "freehand":
        if (action.points && action.points.length > 0) {
          ctx.beginPath()
          ctx.moveTo(action.points[0].x, action.points[0].y)
          action.points.forEach((point) => {
            ctx.lineTo(point.x, point.y)
          })
          ctx.stroke()
        }
        break
      case "text":
        if (action.text) {
          const textAction = action as TextAnnotation
          ctx.font = `${textAction.fontSize || action.size * 4}px ${textAction.fontFamily || 'Arial'}`
          ctx.textAlign = textAction.textAlign || 'left'

          // Draw text background if specified
          if (textAction.backgroundColor) {
            const metrics = ctx.measureText(action.text)
            const textWidth = metrics.width
            const textHeight = textAction.fontSize || action.size * 4

            ctx.fillStyle = textAction.backgroundColor
            ctx.fillRect(
              action.startX - 2,
              action.startY - textHeight + 2,
              textWidth + 4,
              textHeight + 4
            )
            ctx.fillStyle = action.color
          }

          // Draw text border if specified
          if (textAction.borderWidth && textAction.borderColor) {
            ctx.strokeStyle = textAction.borderColor
            ctx.lineWidth = textAction.borderWidth
            const metrics = ctx.measureText(action.text)
            const textWidth = metrics.width
            const textHeight = textAction.fontSize || action.size * 4

            ctx.strokeRect(
              action.startX - 2 - textAction.borderWidth,
              action.startY - textHeight + 2 - textAction.borderWidth,
              textWidth + 4 + textAction.borderWidth * 2,
              textHeight + 4 + textAction.borderWidth * 2
            )
            ctx.strokeStyle = action.color
            ctx.lineWidth = action.size
          }

          ctx.fillText(action.text, action.startX, action.startY)
        }
        break
      case "blur":
        // Enhanced blur with multiple blur types
        applyBlur(ctx, action.startX, action.startY, action.endX!, action.endY!, {
          type: 'gaussian',
          intensity: action.size,
          direction: 'horizontal'
        })
        break
    }
  }

  // Enhanced arrow drawing with customizable options
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    options?: { headLength?: number; headAngle?: number }
  ) => {
    const headLength = options?.headLength || 15
    const headAngle = options?.headAngle || Math.PI / 6
    const angle = Math.atan2(toY - fromY, toX - fromX)

    // Draw line
    ctx.beginPath()
    ctx.moveTo(fromX, fromY)
    ctx.lineTo(toX, toY)
    ctx.stroke()

    // Draw enhanced arrowhead
    ctx.beginPath()
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle - headAngle),
      toY - headLength * Math.sin(angle - headAngle)
    )
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle + headAngle),
      toY - headLength * Math.sin(angle + headAngle)
    )
    ctx.stroke()
  }

  const drawEllipse = (
    ctx: CanvasRenderingContext2D,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    const centerX = (startX + endX) / 2
    const centerY = (startY + endY) / 2
    const radiusX = Math.abs(endX - startX) / 2
    const radiusY = Math.abs(endY - startY) / 2

    ctx.beginPath()
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI)
    ctx.stroke()
  }

  // Advanced blur application function
  const applyBlur = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    endX: number,
    endY: number,
    options: BlurOptions
  ) => {
    const w = Math.abs(endX - x)
    const h = Math.abs(endY - y)

    // Create a temporary canvas for blurring
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    tempCanvas.width = w
    tempCanvas.height = h

    // Copy the area to blur from the original image
    tempCtx?.drawImage(originalImageRef.current!, x, y, w, h, 0, 0, w, h)

    switch (options.type) {
      case 'gaussian':
        // Gaussian blur using CSS filter
        ctx.filter = `blur(${options.intensity}px)`
        ctx.drawImage(tempCanvas, x, y)
        break
      case 'motion':
        // Motion blur using directional blur
        ctx.filter = `blur(${options.intensity}px ${options.direction === 'horizontal' ? 'X' : 'Y'})`
        ctx.drawImage(tempCanvas, x, y)
        break
      case 'pixelate':
        // Pixelation effect
        const pixelSize = Math.max(2, Math.floor(options.intensity / 2))

        // Draw pixelated version
        for (let px = 0; px < w; px += pixelSize) {
          for (let py = 0; py < h; py += pixelSize) {
            const pixelData = tempCtx?.getImageData(px, py, 1, 1)
            if (pixelData) {
              const avgColor = getAverageColor(pixelData.data)
              ctx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`
              ctx.fillRect(px, py, pixelSize, pixelSize)
            }
          }
        }
        break
    }

    // Reset filter
    ctx.filter = 'none'
  }

  // Helper function for pixelation
  const getAverageColor = (data: Uint8ClampedArray) => {
    let r = 0, g = 0, b = 0, count = 0
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
      count++
    }

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count)
    }
  }

  // Smooth freehand drawing with path smoothing
  const smoothPath = (points: { x: number; y: number }[]): { x: number; y: number }[] => {
    if (points.length < 3) return points

    const smoothed: { x: number; y: number }[] = []
    for (let i = 0; i < points.length; i++) {
      if (i === 0 || i === points.length - 1) {
        smoothed.push(points[i])
      } else {
        const prev = points[i - 1]
        const curr = points[i]
        const next = points[i + 1]

        smoothed.push({
          x: curr.x * 0.5 + (prev.x + next.x) * 0.25,
          y: curr.y * 0.5 + (prev.y + next.y) * 0.25
        })
      }
    }
    return smoothed
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
      ...(selectedTool === "text" ? {
        text: "",
        fontSize: fontSize,
        fontFamily: fontFamily,
        textAlign: textAlign
      } : {}),
      ...(selectedTool === "freehand" ? { points: [pos] } : {}),
      ...(selectedTool === "blur" ? {
        blurType: blurType,
        blurIntensity: blurIntensity,
        blurDirection: blurDirection
      } : {})
    }

    setCurrentAction(newAction)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentAction || !overlayCanvasRef.current) return

    const pos = getMousePos(e)
    const overlayCtx = overlayCanvasRef.current.getContext("2d")
    if (!overlayCtx) return

    // Clear overlay and redraw
    overlayCtx.clearRect(
      0,
      0,
      overlayCanvasRef.current.width,
      overlayCanvasRef.current.height
    )

    let updatedAction = { ...currentAction }

    switch (selectedTool) {
      case "arrow":
      case "rectangle":
      case "ellipse":
      case "blur":
        updatedAction.endX = pos.x
        updatedAction.endY = pos.y
        break
      case "freehand":
        const currentPoints = currentAction.points || []
        updatedAction.points = smoothPath([...currentPoints, pos])
        break
    }

    setCurrentAction(updatedAction)
    drawAction(overlayCtx, updatedAction)
  }

  const handleMouseUp = () => {
    if (!isDrawing || !currentAction) return

    const finalAction = { ...currentAction }

    // Handle text input
    if (selectedTool === "text") {
      setTextInputPosition({ x: finalAction.startX, y: finalAction.startY })
      setTextInputValue(finalAction.text || "")
      setTextInputVisible(true)
      // Focus input field after it becomes visible
      setTimeout(() => textInputRef.current?.focus(), 0)
    } else if (
      selectedTool !== "freehand" ||
      (finalAction.points && finalAction.points.length > 1)
    ) {
      addAction(finalAction)
    }

    setIsDrawing(false)
    setCurrentAction(null)

    // Clear overlay
    if (overlayCanvasRef.current) {
      const overlayCtx = overlayCanvasRef.current.getContext("2d")
      overlayCtx?.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      )
    }
  }

  const handleTextInputSubmit = () => {
    if (textInputValue.trim() && currentAction) {
      const finalAction = {
        ...currentAction,
        text: textInputValue.trim()
      }
      addAction(finalAction)
    }
    setTextInputVisible(false)
    setTextInputValue("")
  }

  const handleTextInputCancel = () => {
    setTextInputVisible(false)
    setTextInputValue("")
  }

  // Robust history management
  const addAction = (action: AnnotationAction) => {
    const newActions = [...actions, action]
    setActions(newActions)

    // Update history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newActions)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Fixed undo function
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      setActions(history[newIndex] || [])
      redrawActions()
    }
  }

  // Fixed redo function
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      setActions(history[newIndex])
      redrawActions()
    }
  }

  const exportImage = () => {
    if (!baseCanvasRef.current) return

    // Create a temporary canvas for export
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = width
    exportCanvas.height = height
    const exportCtx = exportCanvas.getContext("2d")

    if (!exportCtx) return

    // Draw base image
    exportCtx.drawImage(baseCanvasRef.current, 0, 0)

    // Draw all actions
    actions.forEach((action) => {
      drawAction(exportCtx, action)
    })

    // Get data URL
    const dataUrl = exportCanvas.toDataURL("image/png")

    // Call export callback
    if (onExport) {
      onExport(dataUrl)
    }
  }

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "z":
            e.preventDefault()
            undo()
            break
          case "y":
            e.preventDefault()
            redo()
            break
          case "s":
            e.preventDefault()
            exportImage()
            break
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [historyIndex, history.length])

  const tools = [
    { value: "arrow", label: "Arrow" },
    { value: "rectangle", label: "Rectangle" },
    { value: "ellipse", label: "Ellipse" },
    { value: "freehand", label: "Freehand" },
    { value: "text", label: "Text" },
    { value: "blur", label: "Blur" }
  ]

  const colors = [
    "#ff0000",
    "#00ff00",
    "#0000ff",
    "#ffff00",
    "#ff00ff",
    "#00ffff",
    "#000000",
    "#ffffff"
  ]

  const fontFamilies = [
    "Arial",
    "Helvetica",
    "Times New Roman",
    "Courier New",
    "Georgia",
    "Verdana"
  ]

  const textAligns = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" }
  ]

  const blurTypes = [
    { value: "gaussian", label: "Gaussian" },
    { value: "motion", label: "Motion" },
    { value: "pixelate", label: "Pixelate" }
  ]

  const blurDirections = [
    { value: "horizontal", label: "Horizontal" },
    { value: "vertical", label: "Vertical" }
  ]

  return (
    <Flex
      align={"stretch"}
      direction={"column"}
      position={"relative"}
      className={`w-full h-full ${className || ""}`}>
      {/* Toolbar */}
      <Flex
        className={""}
        direction={"column"}
        align={"start"}
        gap={"4"}
        px={"4"}
        py={"2"}
      >
        {/* Tool Selection */}
        <SegmentedControl.Root
          value={selectedTool}
          onValueChange={(value) => setSelectedTool(value as any)}>
          {tools.map((tool) => (
            <SegmentedControl.Item key={tool.value} value={tool.value}>
              {tool.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>

        <Flex align={"center"} justify={"between"} width={"100%"}>
          <Flex align={"center"} gap={"4"}>
            {/* Color Picker */}
            <Flex align={"center"} gap={"2"}>
              {colors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  style={{
                    width: 28,
                    height: 28,
                    backgroundColor: color,
                    border:
                      selectedColor === color
                        ? "2px solid var(--accent-9)"
                        : "1px solid var(--gray-4)",
                    borderRadius: 100,
                    cursor: "pointer"
                  }}
                />
              ))}
            </Flex>

            <Separator orientation="vertical" size="1" />

            {/* Brush Size */}
            <Flex align={"center"} gap={"2"}>
              <Slider
                className={"w-32"}
                defaultValue={[brushSize]}
                min={1}
                max={10}
                step={1}
                size={"3"}
                onValueChange={(value) => setBrushSize(value[0])}
              />
              <Text size="2">{brushSize}px</Text>
            </Flex>
          </Flex>

          <Flex align={"center"} gap={"4"}>
            {/* Blur Tool Options - Show only when blur is selected */}
            {selectedTool === "blur" && (
              <>
                <Separator orientation="vertical" size="1" />
                <Flex align={"center"} gap={"2"}>
                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Type:</Text>
                    <SegmentedControl.Root
                      value={blurType}
                      onValueChange={(value) => setBlurType(value as any)}>
                      {blurTypes.map((type) => (
                        <SegmentedControl.Item key={type.value} value={type.value}>
                          {type.label}
                        </SegmentedControl.Item>
                      ))}
                    </SegmentedControl.Root>
                  </Flex>

                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Intensity:</Text>
                    <Slider
                      className={"w-24"}
                      defaultValue={[blurIntensity]}
                      min={1}
                      max={20}
                      step={1}
                      size={"1"}
                      onValueChange={(value) => setBlurIntensity(value[0])}
                    />
                    <Text size="2">{blurIntensity}px</Text>
                  </Flex>

                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Direction:</Text>
                    <SegmentedControl.Root
                      value={blurDirection}
                      onValueChange={(value) => setBlurDirection(value as any)}>
                      {blurDirections.map((direction) => (
                        <SegmentedControl.Item key={direction.value} value={direction.value}>
                          {direction.label}
                        </SegmentedControl.Item>
                      ))}
                    </SegmentedControl.Root>
                  </Flex>
                </Flex>
              </>
            )}

            {/* Text Tool Options - Show only when text is selected */}
            {selectedTool === "text" && (
              <>
                <Separator orientation="vertical" size="1" />
                <Flex align={"center"} gap={"2"}>
                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Font:</Text>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      style={{
                        padding: "4px 8px",
                        border: "1px solid var(--gray-6)",
                        borderRadius: "4px",
                        backgroundColor: "white"
                      }}
                    >
                      {fontFamilies.map((font) => (
                        <option key={font} value={font}>
                          {font}
                        </option>
                      ))}
                    </select>
                  </Flex>

                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Size:</Text>
                    <Slider
                      className={"w-24"}
                      defaultValue={[fontSize]}
                      min={12}
                      max={48}
                      step={2}
                      size={"1"}
                      onValueChange={(value) => setFontSize(value[0])}
                    />
                    <Text size="2">{fontSize}px</Text>
                  </Flex>

                  <Flex align={"center"} gap={"2"}>
                    <Text size="2">Align:</Text>
                    <SegmentedControl.Root
                      value={textAlign}
                      onValueChange={(value) => setTextAlign(value as any)}>
                      {textAligns.map((align) => (
                        <SegmentedControl.Item key={align.value} value={align.value}>
                          {align.label}
                        </SegmentedControl.Item>
                      ))}
                    </SegmentedControl.Root>
                  </Flex>
                </Flex>
              </>
            )}

            {/* Undo/Redo */}
            <Button
              size="1"
              variant="soft"
              onClick={undo}
              disabled={historyIndex <= 0}>
              <LucideUndo size={14} strokeWidth={2} /> Undo
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}>
              <LucideRedo size={14} strokeWidth={2} /> Redo
            </Button>

            <Separator orientation="vertical" size="1" />

            {/* Export */}
            <Button size="1" onClick={exportImage}>
              <LucideSave size={14} strokeWidth={2} /> {exportButtonText}
            </Button>

            {/* Close Button */}
            {showCloseButton && onClose && (
              <>
                <Separator orientation="vertical" size="1" />
                <Button size="1" variant="soft" onClick={onClose}>
                  <LucideX size={14} strokeWidth={2} /> Close
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Flex>

      {/* Canvas Container */}
      <Flex
        direction={"column"}
        position={"relative"}
        gap={"2"}
        p={"2"}
        overflowY={"auto"}
        width={"100%"}
        className={"bg-gray-50"}>
        <canvas
          ref={baseCanvasRef}
          style={{
            border: "1px solid transparent",
            maxWidth: "100%",
            width: "auto",
            height: "auto"
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          width={width}
          height={height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            border: "1px solid transparent",
            maxWidth: "100%",
            width: "auto",
            height: "auto",
            cursor: "crosshair"
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Enhanced Text Input */}
        {textInputVisible && (
          <div
            style={{
              position: "absolute",
              left: textInputPosition.x,
              top: textInputPosition.y,
              zIndex: 1000,
              transform: "translate(-50%, -50%)"
            }}
          >
            <div
              style={{
                backgroundColor: "white",
                border: "1px solid var(--gray-6)",
                borderRadius: "8px",
                padding: "8px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                minWidth: "200px"
              }}
            >
              <input
                ref={textInputRef}
                type="text"
                value={textInputValue}
                onChange={(e) => setTextInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleTextInputSubmit()
                  } else if (e.key === "Escape") {
                    handleTextInputCancel()
                  }
                }}
                onBlur={handleTextInputSubmit}
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  textAlign: textAlign,
                  border: "none",
                  outline: "none",
                  backgroundColor: "transparent",
                  minWidth: "180px",
                  width: "100%"
                }}
                placeholder="Enter text..."
                autoFocus
              />
              <Flex justify={"between"} mt={"2"}>
                <Button size="1" variant="soft" onClick={handleTextInputSubmit}>
                  Save
                </Button>
                <Button size="1" variant="soft" onClick={handleTextInputCancel}>
                  Cancel
                </Button>
              </Flex>
            </div>
          </div>
        )}
      </Flex>
    </Flex>
  )
}

export default AnnotationEditorCore
