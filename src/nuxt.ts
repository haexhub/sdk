/**
 * Nuxt Module for HaexHub SDK
 * Automatically injects polyfills into the built HTML files
 */
import { defineNuxtModule, useNuxt } from '@nuxt/kit'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface ModuleOptions {
  injectPolyfills?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@haexhub/sdk',
    configKey: 'haexhub',
    compatibility: {
      nuxt: '^3.0.0 || ^4.0.0'
    }
  },
  defaults: {
    injectPolyfills: true
  },
  setup(options: ModuleOptions) {
    const nuxt = useNuxt()

    // Only inject polyfills if enabled and building for production
    if (!options.injectPolyfills || nuxt.options.dev) {
      return
    }

    // Add hook to inject polyfills after HTML generation
    nuxt.hook('nitro:build:public-assets', async () => {
      try {
        // Use Nuxt's configured output directory instead of hardcoded path
        const nitroOutput = nuxt.options.nitro?.output || {}
        const outputDir = nitroOutput.dir || '.output'
        const publicDir = nitroOutput.publicDir || 'public'
        const distDir = resolve(nuxt.options.rootDir, outputDir, publicDir)

        // Find polyfill file in the SDK package
        const __dirname = dirname(fileURLToPath(import.meta.url))
        const polyfillPath = resolve(__dirname, '../polyfills-standalone.js')

        let polyfillCode = readFileSync(polyfillPath, 'utf-8')

        // Remove the documentation header (lines 1-6: /** ... <script src=... */ )
        // Keep only the actual IIFE code
        polyfillCode = polyfillCode.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, '').trim()

        const polyfillScript = `<script>${polyfillCode}</script>`

        // Find all HTML files in the output directory
        const htmlFiles = readdirSync(distDir).filter((f: string) => f.endsWith('.html'))

        for (const file of htmlFiles) {
          const filePath = join(distDir, file)
          let html = readFileSync(filePath, 'utf-8')

          // Inject polyfill directly after <head>, BEFORE all other scripts
          const headPos = html.indexOf('<head>')
          if (headPos !== -1) {
            const insertPos = headPos + 6 // after <head>
            html = html.slice(0, insertPos) + polyfillScript + html.slice(insertPos)
          }

          writeFileSync(filePath, html)
          console.log(`✓ [@haexhub/sdk] Polyfill injected into ${file}`)
        }
      } catch (error: unknown) {
        console.error('[@haexhub/sdk] Failed to inject polyfill:', error)
      }
    })
  }
})
