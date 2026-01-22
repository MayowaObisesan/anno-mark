import React, { useRef, useEffect, useState, useCallback } from "react"
import {
  Button,
  Flex,
  SegmentedControl,
  Separator,
  Slider,
  Text
} from "@radix-ui/themes"
import { LucideRedo, LucideSave, LucideUndo, LucideX } from "lucide-react"

import { AnnotationEngine } from "~components/annotation_engine/AnnotationEngine"
import { TextInputOverlay } from "~components/annotation_engine/components"
import type { ToolType } from "~components/annotation_engine/engine/types"
import { Toolbar } from "~components/annotation_engine/toolbar/toolbar"

interface AnnotationEngineProps {
  imageData: string
  width: number
  height: number
  onExport: (dataUrl: string) => void
  onClose: () => void
  exportButtonText?: string
  showCloseButton?: boolean
  className?: string
}

const AnnotationEngineComponent: React.FC<AnnotationEngineProps> = ({
  imageData,
  width,
  height,
  onExport,
  onClose,
  exportButtonText = "Export",
  showCloseButton = false,
  className = ""
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<AnnotationEngine | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  const [selectedTool, setSelectedTool] = useState<ToolType>("arrow")
  const [selectedColor, setSelectedColor] = useState<string>("#ff0000")
  const [brushSize, setBrushSize] = useState<number>(4)
  const [history, setHistory] = useState<string[]>([""])
  const [historyIndex, setHistoryIndex] = useState<number>(0)

  // Text editing state
  const [isTextEditing, setIsTextEditing] = useState<boolean>(false)
  const [textEditingPosition, setTextEditingPosition] = useState<{ x: number; y: number } | null>(null)
  const [textEditingAnnotation, setTextEditingAnnotation] = useState<any>(null)

  const saveToHistory = useCallback(() => {
    if (!engineRef.current) return

    const currentState = engineRef.current.serialize()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(currentState)

    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  // Initialize engine and load image
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    canvas.width = width
    canvas.height = height

    const engine = new AnnotationEngine(canvas)
    engineRef.current = engine

    // Set up event callbacks for automatic history saving and text editing
    engine.setEventCallbacks({
      onAnnotationAdded: saveToHistory,
      onAnnotationModified: saveToHistory,
      onPreviewUpdate: () => {
        // Force a re-render when preview updates
        // The canvas will be redrawn by the engine itself
      },
      onTextEditingChanged: (isEditing) => {
        setIsTextEditing(isEditing)
        if (!isEditing) {
          setTextEditingPosition(null)
          setTextEditingAnnotation(null)
        }
      }
    })

    // Load and set background image
    const img = new Image()
    img.onload = () => {
      imageRef.current = img
      engine.setBackgroundImage(img)
      engine.redraw()
    }
    img.src = imageData

    return () => {
      // Cleanup if needed
    }
  }, [imageData, width, height])

  // Handle text editing position updates from engine
  useEffect(() => {
    if (!engineRef.current) return

    const position = engineRef.current.getTextEditingPosition()
    const annotation = engineRef.current.getTextEditingAnnotation()

    setTextEditingPosition(position)
    setTextEditingAnnotation(annotation)
  }, [engineRef.current?.getIsTextEditing()])

  // Draw background image
  const drawBackground = useCallback(() => {
    if (!canvasRef.current || !imageRef.current) return

    const ctx = canvasRef.current.getContext("2d")
    if (!ctx) return

    // Clear canvas and draw image
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(imageRef.current, 0, 0, width, height)

    // Redraw annotations if engine exists
    if (engineRef.current) {
      engineRef.current.redraw()
    }
  }, [width, height])

  // Tool selection
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setTool(selectedTool)
    }
  }, [selectedTool])

  // Update tool properties
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setToolProperties({
        stroke: selectedColor,
        strokeWidth: brushSize,
        fill: selectedColor+22
      }).then(() => {
        engineRef.current?.redraw()
      })
    }
  }, [selectedColor, brushSize])

  const undo = useCallback(() => {
    if (historyIndex > 0 && engineRef.current) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      engineRef.current.load(history[newIndex])
    }
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && engineRef.current) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      engineRef.current.load(history[newIndex])
    }
  }, [history, historyIndex])

  const exportImage = useCallback(() => {
    if (!engineRef.current) return

    // Create a temporary canvas for export
    const exportCanvas = document.createElement("canvas")
    exportCanvas.width = width
    exportCanvas.height = height
    const exportCtx = exportCanvas.getContext("2d")

    if (!exportCtx) return

    // Draw background image
    if (imageRef.current) {
      exportCtx.drawImage(imageRef.current, 0, 0, width, height)
    }

    // Get annotation data and draw it
    const annotationData = engineRef.current.serialize()
    // This will need to be implemented to draw annotations on export canvas

    // For now, use the engine's export method (which includes background and annotations)
    const dataUrl = engineRef.current.exportPNG()

    if (onExport) {
      onExport(dataUrl)
    }
  }, [width, height, onExport])

  // Text editing handlers
  const handleTextComplete = useCallback((text: string) => {
    if (engineRef.current) {
      engineRef.current.finishTextEditing(text)
    }
  }, [])

  const handleTextCancel = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.cancelTextEditing()
    }
  }, [])

  const handleTextChange = useCallback((text: string) => {
    if (engineRef.current) {
      engineRef.current.updateTextPreview(text)
    }
  }, [])

  // Keyboard shortcuts
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

      // Handle Escape key for text editing
      if (e.key === "Escape" && isTextEditing) {
        e.preventDefault()
        handleTextCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, exportImage, isTextEditing, handleTextCancel])

  const tools = [
    { value: "arrow", label: "Arrow" },
    { value: "rectangle", label: "Rectangle" },
    { value: "ellipse", label: "Ellipse" },
    { value: "freehand", label: "Freehand" },
    { value: "text", label: "Text" }
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
      className={`w-full h-full ${className || ""}`}
    >
      {/* Toolbar */}
      <Flex
        direction={"column"}
        align={"start"}
        gap={"4"}
        px={"4"}
        py={"2"}
      >
        {/* Tool Selection */}
        <SegmentedControl.Root
          value={selectedTool}
          onValueChange={(value) => setSelectedTool(value as ToolType)}
        >
          {tools.map((tool) => (
            <SegmentedControl.Item key={tool.value} value={tool.value}>
              {tool.label}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>

        <Flex align={"center"} justify={"between"} width={"100%"}>
          <Flex align={"center"} gap={"4"}>
            {/* Dynamic Tool Properties Toolbar */}
            {engineRef.current && (
              <Toolbar
                engine={engineRef.current}
                activeTool={selectedTool}
              />
            )}
          </Flex>

          <Flex align={"center"} gap={"4"}>
            {/* Undo/Redo */}
            <Button
              size="1"
              variant="soft"
              onClick={undo}
              disabled={historyIndex <= 0}
            >
              <LucideUndo size={14} strokeWidth={2} /> Undo
            </Button>
            <Button
              size="1"
              variant="soft"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
            >
              <LucideRedo size={14} strokeWidth={2} /> Redo
            </Button>

            <Separator orientation="vertical" size="1" />

            {/* Export */}
            <Button size="1" onClick={exportImage}>
              <LucideSave size={14} strokeWidth={2} /> {exportButtonText}
            </Button>

            {/* Close Button */}
            {/*{showCloseButton && onClose && (
              <>
                <Separator orientation="vertical" size="1" />
                <Button size="1" variant="soft" onClick={onClose}>
                  <LucideX size={14} strokeWidth={2} /> Close
                </Button>
              </>
            )}*/}
          </Flex>
        </Flex>
      </Flex>

      {/* Canvas Container */}
      <Flex
        ref={containerRef}
        direction={"column"}
        position={"relative"}
        gap={"2"}
        p={"2"}
        overflowY={"auto"}
        width={"100%"}
        className={"bg-gray-50"}
      >
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid transparent",
            maxWidth: "100%",
            width: "auto",
            height: "auto",
            cursor: selectedTool === "text" ? "text" : "crosshair"
          }}
        />

        {/* Text Input Overlay */}
        {isTextEditing && textEditingPosition && canvasRef.current && (
          <TextInputOverlay
            position={textEditingPosition}
            initialText={textEditingAnnotation?.text || ""}
            fontSize={brushSize * 4} // Scale font size for better visibility
            fontFamily={"Arial"}
            color={selectedColor}
            onComplete={handleTextComplete}
            onCancel={handleTextCancel}
            canvasElement={canvasRef.current}
            onChange={handleTextChange}
          />
        )}
      </Flex>
    </Flex>
  )
}

export default AnnotationEngineComponent
