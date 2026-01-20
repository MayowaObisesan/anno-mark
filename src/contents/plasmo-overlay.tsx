;

// import cssText from "data-text:~/contents/plasmo-overlay.css";
import {
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Inset,
  Theme
} from "@radix-ui/themes"
import cssText from "data-text:~/globals.css"
import type { PlasmoCSConfig } from "plasmo";
import React, { useEffect, useState } from "react";



import { sendToBackground } from "@plasmohq/messaging";



import AnnotationEditorCore from "~components/AnnotationEditorCore";





;



















;



















;



















;
















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

const PlasmoOverlay = () => {
  const [isCapturing, setIsCapturing] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [imageData, setImageData] = useState<string>('')
  const [imageWidth, setImageWidth] = useState<number>(0)
  const [imageHeight, setImageHeight] = useState<number>(0)

  // Listen for messages from content script
  useEffect(() => {
    const handleShowOverlayEditor = (event: CustomEvent) => {
      const { dataUrl, width, height } = event.detail
      setImageData(dataUrl)
      setImageWidth(width)
      setImageHeight(height)
      setShowEditor(true)
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

  const handleExport = (dataUrl: string) => {
    // Save to storage
    sendToBackground({
      name: 'save-annotation',
      body: { dataUrl }
    })

    // Hide editor
    setShowEditor(false)
  }

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
          <Card className="anno-mark-editor-wrapper h-full">
            <Flex direction={'column'} className="h-full">
              <Flex align={'center'} justify={'between'} p={'4'} className="anno-mark-editor-heade h-12">
                <Heading size={"4"} className="anno-mark-editor-titl">
                  Anno-Mark Editor
                </Heading>
                <IconButton
                  radius={'large'}
                  size={'4'}
                  variant={'soft'}
                  className="anno-mark-editor-clos"
                  onClick={() => setShowEditor(false)}
                  title="Close"
                >
                  ×
                </IconButton>
              </Flex>

              {/*<Inset clip="padding-box" side="all" p={'current'} pb="current">*/}
              {/*</Inset>*/}
              <div className="h-[calc(100%-48px)] anno-mark-editor-conten">
                {imageData ? (
                  <AnnotationEditorCore
                    imageData={imageData}
                    width={imageWidth}
                    height={imageHeight}
                    onExport={handleExport}
                    onClose={() => setShowEditor(false)}
                    exportButtonText="Save & Export"
                    showCloseButton={true}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '24px', marginBottom: '12px' }}>📸</div>
                    <div style={{ fontSize: '18px', color: '#6b7280' }}>Loading capture...</div>
                  </div>
                )}
              </div>
            </Flex>
          </Card>
        </div>
      )}
    </Theme>
  )
}

export default PlasmoOverlay
