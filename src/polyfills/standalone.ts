/**
 * Generates standalone polyfill code for HTML injection
 * This wraps the modular polyfills into an IIFE for immediate execution
 */
import {
  installLocalStoragePolyfill,
  installSessionStoragePolyfill,
} from './localStorage'
import { installCookiePolyfill } from './cookies'
import { installHistoryPolyfill } from './history'
import { installBaseTag } from './baseTag'

/**
 * Get the standalone polyfill code as a string
 * This is used by the Nuxt and Vite plugins to inject polyfills into HTML
 */
export function getPolyfillCode(): string {
  // Convert functions to string and wrap in IIFE
  const iife = `(function() {
  'use strict';

  console.log('[HaexHub] Storage Polyfill loading immediately');

  // localStorage Polyfill
  (${installLocalStoragePolyfill.toString()})();

  // sessionStorage Polyfill
  (${installSessionStoragePolyfill.toString()})();

  // Cookie Polyfill
  (${installCookiePolyfill.toString()})();

  // History API Polyfill
  (${installHistoryPolyfill.toString()})();

  // Base Tag Polyfill (for SPA routing)
  (${installBaseTag.toString()})();

  console.log('[HaexHub] All polyfills loaded successfully');
})();`

  return iife
}
