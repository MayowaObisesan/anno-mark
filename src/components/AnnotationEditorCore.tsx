import { Box, Button, Card, Flex, SegmentedControl, Separator, Slider, Text, Theme } from "@radix-ui/themes";
import { LucideRedo, LucideSave, LucideUndo, LucideX } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import type {
  AnnotationAction,
  AnnotationEditorProps
} from "~types/annotations"

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
  const [history, setHistory] = useState<AnnotationAction[][]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)

  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

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
        redrawActions()
      }
      img.src = imageData
    }
  }, [imageData, width, height])

  // Redraw all actions
  const redrawActions = useCallback(() => {
    if (!baseCanvasRef.current || !overlayCanvasRef.current) return

    const overlayCanvas = overlayCanvasRef.current
    const overlayCtx = overlayCanvas.getContext("2d")
    if (!overlayCtx) return

    // Clear overlay
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

    // Draw all actions on base canvas
    const baseCanvas = baseCanvasRef.current
    const baseCtx = baseCanvas.getContext("2d")
    if (!baseCtx) return

    actions.forEach((action) => {
      drawAction(baseCtx, action)
    })
  }, [actions])

  // Draw a single action
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
          ctx.font = `${action.size * 4}px Arial`
          ctx.fillText(action.text, action.startX, action.startY)
        }
        break
      case "blur":
        // Simplified blur - draw semi-transparent rectangle
        ctx.fillStyle = "rgba(200, 200, 200, 0.7)"
        ctx.fillRect(
          Math.min(action.startX, action.endX!),
          Math.min(action.startY, action.endY!),
          Math.abs(action.endX! - action.startX),
          Math.abs(action.endY! - action.startY)
        )
        break
    }
  }

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number
  ) => {
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
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    )
    ctx.moveTo(toX, toY)
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
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
      ...(selectedTool === "text" ? { text: "Sample Text" } : {}),
      ...(selectedTool === "freehand" ? { points: [pos] } : {})
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
    if (selectedTool === "text") {
      const text = prompt("Enter text:", "Sample Text")
      if (text) {
        finalAction.text = text
        addAction(finalAction)
      }
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

        <Flex align={"center"} justify={'between'} width={'100%'}>
          <Flex align={'center'} gap={'4'}>
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
            <div style={{ display: "none", alignItems: "center", gap: 8 }}>
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

            {/* Radix SLider - Brush Size */}
            <Slider
              className={"w-32"}
              defaultValue={[brushSize * 10]}
              size={"3"}
              onValueChange={(value) => setBrushSize(value[0])}
            />
          </Flex>

          <Flex align={'center'} gap={'4'}>
            {/* Undo/Redo */}
            <Button
              size="1"
              variant="soft"
              onClick={undo}
              disabled={historyIndex <= 0}>
              <LucideUndo size={14} strokeWidth={2} />️ Undo
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}>
              <LucideRedo size={14} strokeWidth={2} />️ Redo
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
        className={"bg-green-600"}>
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
      </Flex>
    </Flex>
    /*<Theme accentColor="crimson" panelBackground={'translucent'} grayColor="sand" radius="none" scaling="95%" className={"dark"}>
    </Theme>*/
  )
}

export default AnnotationEditorCore
