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

    // Configure Nuxt for extension build
    // Use relative paths (no base tag needed with simplified URL format)
    nuxt.options.app.baseURL = './'
    nuxt.options.app.buildAssetsDir = '_nuxt/' // Remove leading slash

    // IMPORTANT: Set vite.base to './' to generate truly relative asset paths
  

    // Disable app manifest feature (generates /_nuxt/builds/meta/*.json)
    // This is not needed for extensions and causes 404 errors
    nuxt.options.experimental = nuxt.options.experimental || {}
    nuxt.options.experimental.appManifest = false

    // Disable payload extraction for SPAs (extensions don't need SSR payload)
    // This prevents "Cannot load payload" errors for _payload.json files
    nuxt.options.experimental.payloadExtraction = false

    console.log('✓ [@haexhub/sdk] Set app.baseURL to relative path (./)')
    console.log('✓ [@haexhub/sdk] Set buildAssetsDir to relative path (_nuxt/)')
    console.log('✓ [@haexhub/sdk] Set vite.base to relative path (./)')
    console.log('✓ [@haexhub/sdk] Disabled appManifest (not needed for extensions)')
    console.log('✓ [@haexhub/sdk] Disabled payloadExtraction (not needed for SPAs)')

    // Only inject polyfills if enabled and building for production
    if (!options.injectPolyfills || nuxt.options.dev) {
      return
    }

    // Add hook to inject polyfills after HTML generation
    nuxt.hook('nitro:build:public-assets', async () => {
      try {
        // Use Nuxt's configured output directory
        const nitroOutput = nuxt.options.nitro?.output || {}
        const outputDir = nitroOutput.dir || '.output'
        const publicDir = nitroOutput.publicDir || 'public'
        const distDir = resolve(nuxt.options.rootDir, outputDir, publicDir)

        // Get polyfill code from modular polyfills
        const polyfillCode = getPolyfillCode()
        const polyfillScript = `<script>${polyfillCode}</script>`

        // Find all HTML files in the output directory
        const htmlFiles = readdirSync(distDir).filter((f: string) => f.endsWith('.html'))

        for (const file of htmlFiles) {
          const filePath = join(distDir, file)
          let html = readFileSync(filePath, 'utf-8')

          // Inject polyfill directly after <head>
          const headPos = html.indexOf('<head>')
          if (headPos !== -1) {
            const insertPos = headPos + 6 // after <head>
            html = html.slice(0, insertPos) + polyfillScript + html.slice(insertPos)
          }

          // IMPORTANT: Convert all absolute asset paths to relative paths
          // Replace all occurrences of /_nuxt/ with _nuxt/ to make paths relative

          // Fix <link> and <script> tags
          html = html.replace(/\b(href|src)="\/_nuxt\//g, '$1="_nuxt/')

          // Fix import maps - need to keep it absolute or use ./ prefix for module resolution
          html = html.replace(/"imports":\{"#entry":"\/_nuxt\//g, '"imports":{"#entry":"./_nuxt/')

          // Fix buildAssetsDir in runtime config
          html = html.replace(/buildAssetsDir:"\/_nuxt\/"/g, 'buildAssetsDir:"./_nuxt/"')

          // Fix any remaining absolute /_nuxt/ references in JSON/JS
          html = html.replace(/"\/_nuxt\//g, '"./_nuxt/')

          writeFileSync(filePath, html)
          console.log(`✓ [@haexhub/sdk] Polyfill and relative paths applied to ${file}`)
        }
      } catch (error: unknown) {
        console.error('[@haexhub/sdk] Failed to inject polyfill:', error)
      }
    })
  }
})
