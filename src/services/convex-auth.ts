import { createClerkClient } from "@clerk/chrome-extension/background"
import { ConvexHttpClient } from "convex/browser"

import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"

import { api } from "../../convex/_generated/api"

const publishableKey = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

if (!publishableKey) {
  throw new Error(
    "Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file"
  )
}

// Initialize Convex client
const convexUrl = process.env.PLASMO_PUBLIC_CONVEX_URL
if (!convexUrl) {
  throw new Error("PLASMO_PUBLIC_CONVEX_URL environment variable is not set")
}

// Create Convex client without authentication initially
// We'll set the authentication token when we get it
export const convex = new ConvexHttpClient(convexUrl)

/**
 * Get Clerk JWT token from background script
 * This function communicates with the background script to get a fresh JWT token
 */
/*export async function getClerkToken(): Promise<string | null> {
  try {
    const response = await sendToBackground({
      name: 'get-clerk-token',
      body: { type: 'get' }
    })
    console.log('[Convex Auth] Clerk token retrieved successfully:', response?.type === "CLERK_TOKEN_RETRIEVED", response);
    if (response?.type === "CLERK_TOKEN_RETRIEVED") {
      return response.data.token
    }
    return null;
  } catch (error) {
    console.error('Error requesting Clerk token:', error);
    return null;
  }
}*/
async function getClerkToken() {
  const clerk = await createClerkClient({
    publishableKey
  })

  // If there is no valid session, then return null. Otherwise proceed.
  if (!clerk.session) {
    return null
  }

  // Return the user's session
  return await clerk.session?.getToken()
}

/**
 * Initialize Convex client with authentication token
 */
export async function initializeAuthenticatedConvex(): Promise<boolean> {
  try {
    const token = await getClerkToken()
    if (token) {
      // Set the authentication token for Convex
      console.log("Convex token retrieved successfully:", token)
      // convex.setAuth(token);
      console.log("Convex client authenticated successfully")
      return true
    } else {
      console.warn("No Clerk token available - Convex client not authenticated")
      return false
    }
  } catch (error) {
    console.error("Error initializing authenticated Convex client:", error)
    return false
  }
}

// User authentication utilities
export interface ClerkUser {
  id: string
  email?: string
  name?: string
  imageUrl?: string
}

/**
 * Get current Clerk user from JWT token
 * This function decodes the JWT token to extract user information
 */
export async function getCurrentClerkUser(): Promise<ClerkUser | null> {
  try {
    const token = await getClerkToken()
    if (!token) {
      return null
    }

    // Decode JWT token to get user information
    // JWT tokens have 3 parts separated by dots: header.payload.signature
    const parts = token.split(".")
    if (parts.length !== 3) {
      console.error("Invalid JWT token format")
      return null
    }

    // Decode the payload (middle part)
    const payload = JSON.parse(atob(parts[1]))

    return {
      id: payload.sub, // Subject is typically the user ID in Clerk tokens
      email: payload.email,
      name:
        payload.name || (payload.first_name && payload.last_name)
          ? `${payload.first_name} ${payload.last_name}`
          : undefined,
      imageUrl: payload.picture || payload.image_url
    }
  } catch (error) {
    console.error("Error getting current Clerk user from token:", error)
    return null
  }
}

/**
 * Check if user is authenticated by checking if we can get a valid token
 */
export async function isUserAuthenticated(): Promise<boolean> {
  try {
    const token = await getClerkToken()
    return !!token
  } catch (error) {
    console.error("Error checking authentication status:", error)
    return false
  }
}

/**
 * Get or create user in Convex
 */
export async function getOrCreateConvexUser(): Promise<string | null> {
  try {
    // First, ensure Convex client is authenticated
    const isAuthenticated = await initializeAuthenticatedConvex()
    if (!isAuthenticated) {
      console.warn("Cannot create/update Convex user: Not authenticated")
      return null
    }

    const clerkUser = await getCurrentClerkUser()
    if (!clerkUser) {
      return null
    }

    // Create or update user in Convex
    const userId = await convex.mutation(api.users.createOrUpdateUser, {
      clerkId: clerkUser.id,
      email: clerkUser.email,
      name: clerkUser.name,
      imageUrl: clerkUser.imageUrl
    })

    return userId
  } catch (error) {
    console.error("Error creating/updating Convex user:", error)
    return null
  }
}

/**
 * Get Convex user ID for current user
 */
export async function getCurrentConvexUserId(): Promise<string | null> {
  try {
    // First, ensure Convex client is authenticated
    const isAuthenticated = await initializeAuthenticatedConvex()
    if (!isAuthenticated) {
      console.warn("Cannot get Convex user ID: Not authenticated")
      return null
    }

    const clerkUser = await getCurrentClerkUser()
    if (!clerkUser) {
      return null
    }

    // Try to get existing user
    const user = await convex.query(api.users.getUserByClerkId, {
      clerkId: clerkUser.id
    })

    if (user) {
      return user._id
    }

    // Create user if doesn't exist
    return await getOrCreateConvexUser()
  } catch (error) {
    console.error("Error getting current Convex user ID:", error)
    return null
  }
}

/**
 * Initialize Convex authentication
 * This should be called when the extension starts
 */
export async function initializeConvexAuth(): Promise<void> {
  try {
    if (await isUserAuthenticated()) {
      await initializeAuthenticatedConvex()
      await getOrCreateConvexUser()
      console.log("Convex authentication initialized successfully")
    } else {
      console.log("User not authenticated - skipping Convex initialization")
    }
  } catch (error) {
    console.error("Error initializing Convex authentication:", error)
  }
}

/**
 * Handle authentication state changes
 */
export function onAuthStateChanged(
  callback: (isAuthenticated: boolean) => void
): void {
  // This would typically be implemented with Clerk's auth state listener
  // For Chrome extension context, we might need to poll or use storage events

  // For now, we'll set up a storage listener for Clerk session changes using Plasmo storage
  // TODO: Implement proper storage watching once Plasmo storage API is fully available
  // For now, we'll use a simple polling approach or Chrome storage as fallback
  const checkAuth = () => {
    isUserAuthenticated().then(callback)
  }

  // Check authentication status every 2 seconds
  const interval = setInterval(checkAuth, 2000)

  // Return cleanup function
  return () => {
    clearInterval(interval)
  }
}

/**
 * Sign out user from Convex perspective
 */
export async function signOutConvex(): Promise<void> {
  try {
    // Convex doesn't have a concept of "sign out" for the client
    // The authentication is handled by Clerk
    // We just clear any local Convex-related data if needed

    console.log("Convex sign out completed")
  } catch (error) {
    console.error("Error signing out from Convex:", error)
  }
}
