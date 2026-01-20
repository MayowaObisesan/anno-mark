import React, { useState, useEffect } from 'react'
import { Button, Flex, Text, Theme, SegmentedControl, Separator } from "@radix-ui/themes"
import '../globals.css'
import AnnotationEditorCore from '~components/AnnotationEditorCore'
import type { AnnotationAction } from '~types/annotations'

interface EditorProps {
  data?: string
  width?: number
  height?: number
}

const Editor: React.FC<EditorProps> = () => {
  const [imageData, setImageData] = useState<string>('')
  const [imageWidth, setImageWidth] = useState<number>(0)
  const [imageHeight, setImageHeight] = useState<number>(0)

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

  const handleExport = (dataUrl: string) => {
    // Create a download link
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `annotation-${Date.now()}.png`
    a.click()
  }

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
          <AnnotationEditorCore
            imageData={imageData}
            width={imageWidth}
            height={imageHeight}
            onExport={handleExport}
            exportButtonText="Export PNG"
            showCloseButton={false}
          />
        </div>
      </div>
    </Theme>
  )
}

export default Editor
