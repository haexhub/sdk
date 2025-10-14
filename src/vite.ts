/**
 * Vite Plugin for HaexHub SDK
 * Automatically injects polyfills into HTML files
 * Works with React, Vue, Svelte, and any other Vite-based project
 */
import type { Plugin } from 'vite'
import { getPolyfillCode } from './polyfills/standalone'
import { applyCorsHeaders } from './cors'

export interface VitePluginOptions {
  /**
   * Enable/disable polyfill injection
   * @default true
   */
  injectPolyfills?: boolean

  /**
   * Configure CORS for dev server
   * @default true
   */
  configureCors?: boolean
}

/**
 * HaexHub Vite Plugin
 * Injects browser API polyfills for extensions running in custom protocols
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { haexhubPlugin } from '@haexhub/sdk/vite'
 *
 * export default {
 *   plugins: [haexhubPlugin()]
 * }
 * ```
 */
export function haexhubPlugin(options: VitePluginOptions = {}): Plugin {
  const { injectPolyfills = true, configureCors = true } = options

  let polyfillCode: string | null = null

  return {
    name: '@haexhub/sdk',
    enforce: 'post', // Run after other plugins

    configResolved(config) {
      if (injectPolyfills) {
        try {
          // Get polyfill code from modular polyfills
          polyfillCode = getPolyfillCode()
          console.log('✓ [@haexhub/sdk] Polyfills initialized')
        } catch (error) {
          console.error('[@haexhub/sdk] Failed to initialize:', error)
          throw error
        }
      }

      // Log CORS configuration
      if (configureCors && config.command === 'serve') {
        console.log('✓ [@haexhub/sdk] CORS configured for HaexHub development')
        console.log('  - Allowing all origins (required for custom protocols)')
        console.log('  - Allowing credentials')
      }
    },

    configureServer(server) {
      if (!configureCors) return

      // Add CORS middleware for HaexHub using shared CORS configuration
      server.middlewares.use((req, res, next) => {
        // Apply CORS headers (allows custom protocols like haex-extension://)
        applyCorsHeaders(res, req.headers.origin)

        // Handle preflight requests
        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          res.end()
          return
        }

        next()
      })
    },

    transformIndexHtml: {
      order: 'pre', // Inject before other transformations
      handler(html: string) {
        if (!injectPolyfills || !polyfillCode) {
          return html
        }

        // Inject polyfill script directly after <head>
        const headPos = html.indexOf('<head>')
        if (headPos === -1) {
          console.warn('[@haexhub/sdk] No <head> tag found in HTML')
          return html
        }

        const insertPos = headPos + 6 // after <head>

        // Inject polyfill only (no base tag needed)
        const polyfillScript = `<script>${polyfillCode}</script>`
        const modifiedHtml = html.slice(0, insertPos) + polyfillScript + html.slice(insertPos)

        console.log('✓ [@haexhub/sdk] Polyfill injected into HTML')

        return modifiedHtml
      }
    }
  }
}

// Default export for convenience
export default haexhubPlugin
