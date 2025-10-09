/**
 * Vite Plugin for HaexHub SDK
 * Automatically injects polyfills into HTML files
 * Works with React, Vue, Svelte, and any other Vite-based project
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

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
        // Load and prepare polyfill code
        const __dirname = dirname(fileURLToPath(import.meta.url))
        const polyfillPath = resolve(__dirname, '../polyfills-standalone.js')

        let code = readFileSync(polyfillPath, 'utf-8')

        // Remove documentation header
        code = code.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, '').trim()

        polyfillCode = code
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
