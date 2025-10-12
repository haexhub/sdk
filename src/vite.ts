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
      } catch (error) {
        console.error('[@haexhub/sdk] Failed to load polyfill:', error)
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

        // Add a placeholder base tag that will be filled by the polyfill
        // This ensures the base tag exists before any assets are loaded
        const baseTagPlaceholder = `<base href="/" id="haexhub-base">`
        const polyfillScript = `<script>${polyfillCode}</script>`

        const modifiedHtml = html.slice(0, insertPos) + baseTagPlaceholder + polyfillScript + html.slice(insertPos)

        console.log('✓ [@haexhub/sdk] Base tag placeholder and polyfill injected into HTML')

        return modifiedHtml
      }
    }
  }
}

// Default export for convenience
export default haexhubPlugin
