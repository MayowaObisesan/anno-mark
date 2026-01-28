import type { PlasmoMessaging } from "@plasmohq/messaging"
import { createClerkClient } from "@clerk/chrome-extension/background"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  console.log('Get Clerk Token handler received:', req)

  const { type } = req.body;

  console.log('[Background service worker] getToken:', type)

  if (type === "get") {
    try {
      // Import and use the existing getToken function from background/index.ts
      const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

      if (!publishableKey) {
        throw new Error('Please add PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file')
      }

      const clerk = await createClerkClient({
        publishableKey,
      })

      // If there is no valid session, then return null
      if (!clerk.session) {
        return null;
      }

      // Return the user's session token
      const token = await clerk.session?.getToken();
      res.send({
        type: 'CLERK_TOKEN_RETRIEVED',
        data: { token }
      })
    } catch (error) {
      console.error('[Background service worker] Error getting token:', JSON.stringify(error));
      // return { token: null };
      res.send({
        type: 'CLERK_ANNOTATIONS_RETRIEVED',
        data: { token: null }
      })
    }
  }
};

export default handler;
