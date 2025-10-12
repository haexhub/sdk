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

    // Read extension info and set baseURL (for both dev and prod)
    try {
      const possiblePaths = [
        resolve(nuxt.options.rootDir, 'haextension', 'manifest.json'),
        resolve(nuxt.options.rootDir, 'public', 'manifest.json'),
        resolve(nuxt.options.rootDir, 'manifest.json'),
      ]

      let manifest: { public_key?: string; name?: string; version?: string } | null = null

      for (const manifestPath of possiblePaths) {
        try {
          const manifestContent = readFileSync(manifestPath, 'utf-8')
          manifest = JSON.parse(manifestContent)
          break
        } catch (e) {
          // Try next path
        }
      }

      if (manifest?.name && manifest?.version) {
        // Read public_key from haextension/public.key if not in manifest
        let publicKey = manifest.public_key
        if (!publicKey) {
          const publicKeyPath = resolve(nuxt.options.rootDir, 'haextension', 'public.key')
          try {
            publicKey = readFileSync(publicKeyPath, 'utf-8').trim()
          } catch (e) {
            // Ignore - will use relative paths
          }
        }

        // Set baseURL to relative path so Nuxt generates relative asset URLs
        // The actual base path is injected via <base> tag in HTML at build time
        if (publicKey && /^[0-9a-f]{64}$/i.test(publicKey)) {
          // Use relative baseURL and buildAssetsDir so assets become relative
          // (e.g., _nuxt/... instead of /_nuxt/...)
          nuxt.options.app.baseURL = './'
          nuxt.options.app.buildAssetsDir = '_nuxt/' // Remove leading slash

          // IMPORTANT: Set vite.base to './' to generate truly relative asset paths
          // This overrides Nuxt's default absolute path behavior
          nuxt.options.vite = nuxt.options.vite || {}
          nuxt.options.vite.base = './'

          // Disable app manifest feature (generates /_nuxt/builds/meta/*.json)
          // This is not needed for extensions and causes 404 errors with relative paths
          nuxt.options.experimental = nuxt.options.experimental || {}
          nuxt.options.experimental.appManifest = false

          console.log(`✓ [@haexhub/sdk] Set app.baseURL to relative path (./) for base tag compatibility`)
          console.log(`✓ [@haexhub/sdk] Set buildAssetsDir to relative path (_nuxt/)`)
          console.log(`✓ [@haexhub/sdk] Set vite.base to relative path (./)`)
          console.log(`✓ [@haexhub/sdk] Disabled appManifest (not needed for extensions)`)
          console.log(`  Base tag will be: /${publicKey}/${manifest.name}/${manifest.version}/`)
        }
      }
    } catch (e) {
      // Ignore - baseURL will remain at default
    }

    // Only inject polyfills if enabled and building for production
    if (!options.injectPolyfills || nuxt.options.dev) {
      return
    }

    // Add hook to inject polyfills after HTML generation
    nuxt.hook('nitro:build:public-assets', async () => {
      try {
        // Read manifest.json to get extension info
        // Priority: haextension/manifest.json (build-time config) > public/manifest.json (legacy)
        const possiblePaths = [
          resolve(nuxt.options.rootDir, 'haextension', 'manifest.json'),
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
          const publicKeyPath = resolve(nuxt.options.rootDir, 'haextension', 'public.key')
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

        // Use Nuxt's configured output directory instead of hardcoded path
        const nitroOutput = nuxt.options.nitro?.output || {}
        const outputDir = nitroOutput.dir || '.output'
        const publicDir = nitroOutput.publicDir || 'public'
        const distDir = resolve(nuxt.options.rootDir, outputDir, publicDir)

        // Get polyfill code from modular polyfills
        const polyfillCode = getPolyfillCode()
        const polyfillScript = `<script>${polyfillCode}</script>`

        // Create base tag with correct path (all fields are now validated)
        const baseTag = `<base href="/${manifest.public_key}/${manifest.name}/${manifest.version}/" id="haexhub-base">`
        console.log(`✓ [@haexhub/sdk] Using static base tag: /${manifest.public_key}/${manifest.name}/${manifest.version}/`)

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

          // IMPORTANT: Convert all absolute asset paths to relative paths
          // Replace all occurrences of /_nuxt/ with _nuxt/ to make paths relative
          // This makes the base tag work correctly (base tag only affects relative URLs)

          // Fix <link> and <script> tags
          html = html.replace(/\b(href|src)="\/_nuxt\//g, '$1="_nuxt/')

          // Fix import maps - need to keep it absolute or use ./ prefix for module resolution
          html = html.replace(/"imports":\{"#entry":"\/_nuxt\//g, '"imports":{"#entry":"./_nuxt/')

          // Fix buildAssetsDir in runtime config
          html = html.replace(/buildAssetsDir:"\/_nuxt\/"/g, 'buildAssetsDir:"./_nuxt/"')

          // Fix any remaining absolute /_nuxt/ references in JSON/JS
          html = html.replace(/"\/_nuxt\//g, '"./_nuxt/')

          writeFileSync(filePath, html)
          console.log(`✓ [@haexhub/sdk] Base tag, polyfill, and relative paths applied to ${file}`)
        }
      } catch (error: unknown) {
        console.error('[@haexhub/sdk] Failed to inject polyfill:', error)
      }
    })
  }
})
