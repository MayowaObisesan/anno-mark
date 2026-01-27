import { ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/chrome-extension'
import { Button, Flex, Text, Theme, Spinner } from "@radix-ui/themes"
import { useState } from "react"
import './globals.css'
import { sendToBackground } from "@plasmohq/messaging"
import type { StartCaptureMessage } from "~types/messages"

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY
const EXTENSION_URL = chrome.runtime.getURL('.')

if (!PUBLISHABLE_KEY) {
  throw new Error('Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
}

function IndexPopup() {
  const [isCapturing, setIsCapturing] = useState(false)

  const handleStartCapture = async () => {
    console.log('handleStartCapture called')
    setIsCapturing(true)

    try {
      const response = await sendToBackground({
        name: 'start-capture',
        body: { useOverlay: false }
      })

      console.log('Start capture response:', response)

      if (!response) {
        console.error('No response from background script')
        alert('Failed to start capture. Please try again.')
        return
      }

      if (response.type === 'CAPTURE_ERROR') {
        console.error('Capture failed:', response.data.error)
        alert(`Capture failed: ${response.data.error}`)
        return
      }

      window.close()
    } catch (error) {
      console.error('Failed to start capture:', error)
      alert('An unexpected error occurred. Please try again.')
    } finally {
      setIsCapturing(false)
    }
  }

  return (
    <Theme accentColor="crimson" grayColor="sand" radius="large" scaling="95%" className={"dark"}>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        afterSignOutUrl={`${EXTENSION_URL}/popup.html`}
        signInFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
        signUpFallbackRedirectUrl={`${EXTENSION_URL}/popup.html`}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: 16,
            width: 320,
          }}>
          <header className="plasmo-w-full">
            {/* Show the sign-in and sign-up buttons when the user is signed out */}
            <SignedOut>
              <SignInButton mode="modal" />
              <SignUpButton mode="modal" />
            </SignedOut>
            {/* Show the user button when the user is signed in */}
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          <Flex direction="column" gap="4">
            <Text size="4" weight="bold" align="center">
              Anno-Mark
            </Text>
            <Text size="2" color="gray" align="center">
              Capture and annotate full-page screenshots
            </Text>

            <Button
              size="3"
              onClick={handleStartCapture}
              disabled={isCapturing}
              style={{ marginTop: 8 }}
            >
              {isCapturing ? (
                <>
                  <Spinner size="2" />
                  <span style={{ marginLeft: 8 }}>Capturing...</span>
                </>
              ) : (
                "Capture Full Page"
              )}
            </Button>

            <Button
              size="2"
              variant="soft"
              onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('tabs/gallery.html') })}
              style={{ marginTop: 4 }}
            >
              My Annotations
            </Button>

            <Text size="1" color="gray" align="center">
              Click to capture the entire page and open the annotation editor
            </Text>
          </Flex>
        </div>
      </ClerkProvider>
    </Theme>
  )
}

export default IndexPopup
