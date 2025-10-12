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

  // Check if base tag already exists
  if (document.querySelector('base[href]')) {
    console.log('[HaexHub] Base tag already exists, skipping')
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

      // Create and inject base tag with new path structure
      const baseTag = document.createElement('base')
      baseTag.href = `/${extensionInfo.publicKey}/${extensionInfo.name}/${extensionInfo.version}/`

      // Insert at the beginning of <head>
      const head = document.head || document.querySelector('head')
      if (head) {
        head.insertBefore(baseTag, head.firstChild)
        console.log(`[HaexHub] Base tag injected: ${baseTag.href}`)
      } else {
        console.warn('[HaexHub] No <head> found, cannot inject base tag')
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
