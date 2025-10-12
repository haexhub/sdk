/**
 * Vite Plugin for HaexHub SDK
 * Automatically injects polyfills into HTML files
 * Works with React, Vue, Svelte, and any other Vite-based project
 */
import type { Plugin } from 'vite'
import { getPolyfillCode } from './polyfills/standalone'

export interface VitePluginOptions {
  /**
   * Enable/disable polyfill injection
   * @default true
   */
  injectPolyfills?: boolean
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
  const { injectPolyfills = true } = options

  let polyfillCode: string | null = null

  return {
    name: '@haexhub/sdk',
    enforce: 'post', // Run after other plugins

    configResolved() {
      if (!injectPolyfills) return

      try {
        // Get polyfill code from modular polyfills
        polyfillCode = getPolyfillCode()
        console.log('✓ [@haexhub/sdk] Polyfills initialized')
      } catch (error) {
        console.error('[@haexhub/sdk] Failed to initialize:', error)
        throw error
      }
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
