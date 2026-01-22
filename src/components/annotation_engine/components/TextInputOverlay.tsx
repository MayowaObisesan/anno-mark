import React, { useEffect, useRef, useState, useCallback } from "react"
import type { Point } from "~components/annotation_engine/engine/types"
import { convertHexToRgba, type HexString } from "~components/annotation_engine/engine/utils"
import { toolSettingsStore } from "~services/tool-settings-store"

interface TextInputOverlayProps {
  position: Point
  initialText?: string
  fontSize: number
  fontFamily: string
  color: HexString | string
  onComplete: (text: string) => void
  onCancel: () => void
  canvasElement: HTMLCanvasElement
  onChange?: (text: string) => void
}

export const TextInputOverlay: React.FC<TextInputOverlayProps> = ({
  position,
  initialText = "",
  fontSize,
  fontFamily,
  color,
  onComplete,
  onCancel,
  canvasElement,
  onChange
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState(initialText)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 })
  const [isAutoResizing, setIsAutoResizing] = useState(false)
  const textColor = toolSettingsStore.getPropertySync('text', 'stroke')
  const textSize = toolSettingsStore.getPropertySync('text', 'fontSize')

  // Calculate overlay position based on canvas coordinates
  const calculateOverlayPosition = useCallback(() => {
    if (!canvasElement) return { x: 0, y: 0 }

    const rect = canvasElement.getBoundingClientRect()
    const scaleX = canvasElement.width / rect.width
    const scaleY = canvasElement.height / rect.height

    // Convert canvas coordinates to screen coordinates
    const screenX = rect.left + (position.x / scaleX)
    const screenY = rect.top + (position.y / scaleY)

    return { x: screenX, y: screenY }
  }, [position, canvasElement])

  // Auto-resize textarea based on content
  const resizeTextarea = useCallback(() => {
    if (!textareaRef.current || isAutoResizing) return

    setIsAutoResizing(true)

    const textarea = textareaRef.current
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 200) // Max height of 200px
    textarea.style.height = newHeight + 'px'

    // Adjust width based on content (with minimum width)
    const newWidth = Math.max(textarea.scrollWidth, 120) // Min width of 120px
    textarea.style.width = newWidth + 'px'

    setTimeout(() => setIsAutoResizing(false), 0)
  }, [isAutoResizing])

  // Update position when canvas or position changes
  useEffect(() => {
    const newPosition = calculateOverlayPosition()
    setOverlayPosition(newPosition)
  }, [calculateOverlayPosition])

  // Focus textarea when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Set cursor to end of text
      textareaRef.current.setSelectionRange(text.length, text.length)
    }
  }, [])

  // Handle text changes with auto-resize
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    setText(newText)

    // Auto-resize after a short delay to prevent layout thrashing
    setTimeout(resizeTextarea, 10)

    // Call onChange prop if provided
    if (onChange) {
      onChange(newText)
    }
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onComplete(text.trim())
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
    // Allow Shift+Enter for new lines
  }

  // Handle clicks outside the overlay
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        onComplete(text.trim())
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [text, onComplete])

  // Auto-resize when text changes
  useEffect(() => {
    resizeTextarea()
  }, [text, resizeTextarea])

  return (
    <div
      style={{
        position: 'fixed',
        left: overlayPosition.x,
        top: overlayPosition.y,
        zIndex: 1000,
        background: convertHexToRgba(textColor),
        border: `2px solid ${textColor}`,
        borderRadius: '4px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        minWidth: '120px',
        maxWidth: '400px'
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        style={{
          border: 'none',
          outline: 'none',
          resize: 'none',
          fontFamily: fontFamily,
          fontSize: `${textSize}px`,
          color: textColor,
          background: 'transparent',
          width: '100%',
          minWidth: '100px',
          lineHeight: '1.4',
          padding: '0',
          overflow: 'hidden'
        }}
        placeholder="Type text here..."
        rows={1}
      />
    </div>
  )
}

/*The new text canvas implementation works, but there are few fixes to be made.
1. The text canvas doesn't respect the selected color for it's stroke and fill as other tools do.
  2. A saved text cannot be dragged, it can only be clicked to re-edit and once clicked,
  3. the current color is applied irrespective of whether that was the color set when the text was created.*/
