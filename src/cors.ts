/**
 * CORS Configuration for HaexHub Extensions
 * Used by both Vite and Nuxt plugins to ensure consistent CORS headers
 */

/**
 * Standard CORS headers for HaexHub dev servers
 * Allows extensions to be loaded in custom protocol iframes (haex-extension://)
 */
export const HAEXHUB_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Credentials': 'true',
} as const

/**
 * Apply CORS headers to a Node.js response object
 * Used in Vite middleware
 */
export function applyCorsHeaders(
  res: { setHeader: (name: string, value: string) => void },
  origin?: string
) {
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', HAEXHUB_CORS_HEADERS['Access-Control-Allow-Methods'])
  res.setHeader('Access-Control-Allow-Headers', HAEXHUB_CORS_HEADERS['Access-Control-Allow-Headers'])
  res.setHeader('Access-Control-Allow-Credentials', HAEXHUB_CORS_HEADERS['Access-Control-Allow-Credentials'])
}

/**
 * Get CORS headers as a plain object
 * Used in Vite/Nuxt config
 */
export function getCorsHeaders(origin?: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin || HAEXHUB_CORS_HEADERS['Access-Control-Allow-Origin'],
    'Access-Control-Allow-Methods': HAEXHUB_CORS_HEADERS['Access-Control-Allow-Methods'],
    'Access-Control-Allow-Headers': HAEXHUB_CORS_HEADERS['Access-Control-Allow-Headers'],
    'Access-Control-Allow-Credentials': HAEXHUB_CORS_HEADERS['Access-Control-Allow-Credentials'],
  }
}
