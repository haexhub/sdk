/**
 * Nuxt Module for HaexHub SDK
 * Automatically injects polyfills into the built HTML files
 */
import { defineNuxtModule, useNuxt } from '@nuxt/kit'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { getPolyfillCode } from './polyfills/standalone'

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
        // Read manifest.json to get extension info
        // Try multiple possible locations
        const possiblePaths = [
          resolve(nuxt.options.rootDir, 'public', 'manifest.json'),
          resolve(nuxt.options.rootDir, 'manifest.json'),
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
          console.warn('[@haexhub/sdk] Could not read manifest.json - base tag will be set dynamically')
        }

        // Use Nuxt's configured output directory instead of hardcoded path
        const nitroOutput = nuxt.options.nitro?.output || {}
        const outputDir = nitroOutput.dir || '.output'
        const publicDir = nitroOutput.publicDir || 'public'
        const distDir = resolve(nuxt.options.rootDir, outputDir, publicDir)

        // Get polyfill code from modular polyfills
        const polyfillCode = getPolyfillCode()
        const polyfillScript = `<script>${polyfillCode}</script>`

        // If we have manifest info, create base tag with correct path
        // Otherwise use placeholder that will be updated at runtime
        let baseTag: string
        if (manifest?.public_key && manifest?.name && manifest?.version) {
          baseTag = `<base href="/${manifest.public_key}/${manifest.name}/${manifest.version}/" id="haexhub-base">`
          console.log(`✓ [@haexhub/sdk] Using static base tag from manifest: /${manifest.public_key}/${manifest.name}/${manifest.version}/`)
        } else {
          baseTag = `<base href="/" id="haexhub-base">`
          console.log('[@haexhub/sdk] Using dynamic base tag (will be set at runtime)')
        }

        // Find all HTML files in the output directory
        const htmlFiles = readdirSync(distDir).filter((f: string) => f.endsWith('.html'))

        for (const file of htmlFiles) {
          const filePath = join(distDir, file)
          let html = readFileSync(filePath, 'utf-8')

          // Inject base tag and polyfill directly after <head>, BEFORE all other content
          const headPos = html.indexOf('<head>')
          if (headPos !== -1) {
            const insertPos = headPos + 6 // after <head>
            html = html.slice(0, insertPos) + baseTag + polyfillScript + html.slice(insertPos)
          }

          writeFileSync(filePath, html)
          console.log(`✓ [@haexhub/sdk] Base tag and polyfill injected into ${file}`)
        }
      } catch (error: unknown) {
        console.error('[@haexhub/sdk] Failed to inject polyfill:', error)
      }
    })
  }
})
