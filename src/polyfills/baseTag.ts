/**
 * Base Tag Polyfill
 * Dynamically injects <base> tag for SPA routing in custom protocol
 */

// Add type declaration for the global flag
declare global {
  interface Window {
    __HAEXHUB_BASE_TAG_INSTALLING__?: boolean
  }
}

/**
 * Installs the base tag by fetching extension info from the parent window
 * Must run after the SDK initializes and extension info is available
 */
export function installBaseTag() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  // Check if installation is already in progress (prevents duplicate runs)
  if (window.__HAEXHUB_BASE_TAG_INSTALLING__) {
    console.log('[HaexHub] Base tag installation already in progress, skipping')
    return
  }

  console.log('[HaexHub] Base tag installation starting')

  // Check if we're in an iframe (extension context)
  if (window.self === window.top) {
    console.log('[HaexHub] Not in iframe, skipping base tag')
    return
  }

  // Find existing base tag (placeholder or already set)
  const existingBaseTag = document.querySelector('base#haexhub-base') as HTMLBaseElement | null

  // If base tag already has correct href (not just "/"), skip
  if (existingBaseTag && existingBaseTag.href && existingBaseTag.href !== window.location.origin + '/') {
    console.log('[HaexHub] Base tag already configured, skipping')
    return
  }

  // Mark as installing to prevent duplicate runs
  window.__HAEXHUB_BASE_TAG_INSTALLING__ = true

  // Request extension info from parent window
  const requestId = `base_tag_${Date.now()}`

  const messageHandler = (event: MessageEvent) => {
    const data = event.data

    // Check if this is a response to our request
    if (data.id === requestId && data.result) {
      const extensionInfo = data.result

      // Use direct path structure: /{public_key}/{name}/{version}/
      if (!extensionInfo.publicKey || !extensionInfo.name || !extensionInfo.version) {
        console.error('[HaexHub] Missing required extension info fields:', extensionInfo)
        window.removeEventListener('message', messageHandler)
        return
      }

      // Update existing base tag or create new one
      const newHref = `/${extensionInfo.publicKey}/${extensionInfo.name}/${extensionInfo.version}/`

      if (existingBaseTag) {
        // Update existing placeholder
        existingBaseTag.href = newHref
        console.log(`[HaexHub] Base tag updated: ${existingBaseTag.href}`)
      } else {
        // Create new base tag (fallback if placeholder wasn't injected)
        const baseTag = document.createElement('base')
        baseTag.id = 'haexhub-base'
        baseTag.href = newHref

        const head = document.head || document.querySelector('head')
        if (head) {
          head.insertBefore(baseTag, head.firstChild)
          console.log(`[HaexHub] Base tag created: ${baseTag.href}`)
        } else {
          console.warn('[HaexHub] No <head> found, cannot inject base tag')
        }
      }

      // Clean up listener
      window.removeEventListener('message', messageHandler)
    }
  }

  // Listen for response
  window.addEventListener('message', messageHandler)

  // Request extension info
  window.parent.postMessage({
    id: requestId,
    method: 'extension.getInfo',
    params: {},
    timestamp: Date.now()
  }, '*')

  // Timeout after 5 seconds
  setTimeout(() => {
    window.removeEventListener('message', messageHandler)
  }, 5000)
}
