/**
 * Vite Plugin for HaexHub SDK
 * Automatically injects polyfills into HTML files
 * Works with React, Vue, Svelte, and any other Vite-based project
 */
import type { Plugin } from 'vite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
  let baseTag: string | null = null

  return {
    name: '@haexhub/sdk',
    enforce: 'post', // Run after other plugins

    configResolved(config) {
      if (!injectPolyfills) return

      try {
        // Get polyfill code from modular polyfills
        polyfillCode = getPolyfillCode()

        // Read manifest.json to get extension info
        const possiblePaths = [
          resolve(config.root, 'haextension', 'manifest.json'),
          resolve(config.root, 'public', 'manifest.json'),
          resolve(config.root, 'manifest.json'),
        ]

        let manifest: { public_key?: string; name?: string; version?: string } | null = null

        for (const manifestPath of possiblePaths) {
          try {
            const manifestContent = readFileSync(manifestPath, 'utf-8')
            manifest = JSON.parse(manifestContent)
            console.log(`[@haexhub/sdk] Found manifest at: ${manifestPath}`)
            break
          } catch (e) {
            // Try next path
          }
        }

        if (!manifest) {
          throw new Error('[@haexhub/sdk] ERROR: Could not find manifest.json in haextension/, public/, or root directory. Please create haextension/manifest.json with name, version, and public_key fields.')
        }

        // Validate required fields
        if (!manifest.name) {
          throw new Error('[@haexhub/sdk] ERROR: manifest.json is missing required field "name"')
        }

        if (!manifest.version) {
          throw new Error('[@haexhub/sdk] ERROR: manifest.json is missing required field "version"')
        }

        // Read public_key from haextension/public.key if not in manifest
        if (!manifest.public_key) {
          const publicKeyPath = resolve(config.root, 'haextension', 'public.key')
          try {
            const publicKey = readFileSync(publicKeyPath, 'utf-8').trim()

            // Validate public key format (should be 64 hex characters)
            if (!/^[0-9a-f]{64}$/i.test(publicKey)) {
              throw new Error(`[@haexhub/sdk] ERROR: Invalid public_key format in ${publicKeyPath}. Expected 64 hexadecimal characters, got: ${publicKey}`)
            }

            manifest.public_key = publicKey
            console.log(`[@haexhub/sdk] Loaded public_key from: ${publicKeyPath}`)
          } catch (e) {
            if (e instanceof Error && e.message.includes('ERROR:')) {
              throw e // Re-throw validation errors
            }
            throw new Error('[@haexhub/sdk] ERROR: Could not read haextension/public.key - this file is required for building extensions')
          }
        } else {
          // Validate public_key format if provided in manifest
          if (!/^[0-9a-f]{64}$/i.test(manifest.public_key)) {
            throw new Error(`[@haexhub/sdk] ERROR: Invalid public_key format in manifest.json. Expected 64 hexadecimal characters, got: ${manifest.public_key}`)
          }
        }

        // Create base tag with correct path (all fields are now validated)
        baseTag = `<base href="/${manifest.public_key}/${manifest.name}/${manifest.version}/" id="haexhub-base">`
        console.log(`✓ [@haexhub/sdk] Using static base tag: /${manifest.public_key}/${manifest.name}/${manifest.version}/`)
      } catch (error) {
        console.error('[@haexhub/sdk] Failed to initialize:', error)
        throw error
      }
    },

    transformIndexHtml: {
      order: 'pre', // Inject before other transformations
      handler(html: string) {
        if (!injectPolyfills || !polyfillCode || !baseTag) {
          return html
        }

        // Inject polyfill script directly after <head>
        const headPos = html.indexOf('<head>')
        if (headPos === -1) {
          console.warn('[@haexhub/sdk] No <head> tag found in HTML')
          return html
        }

        const insertPos = headPos + 6 // after <head>

        // Inject base tag and polyfill
        const polyfillScript = `<script>${polyfillCode}</script>`
        const modifiedHtml = html.slice(0, insertPos) + baseTag + polyfillScript + html.slice(insertPos)

        console.log('✓ [@haexhub/sdk] Base tag and polyfill injected into HTML')

        return modifiedHtml
      }
    }
  }
}

// Default export for convenience
export default haexhubPlugin
