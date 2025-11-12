/**
 * HaexHub Extension Polyfills
 *
 * Auto-initializing polyfills for localStorage, cookies, and history API
 * that work around restrictions in custom protocol contexts (haex-extension://)
 *
 * These polyfills are automatically installed when you import the SDK:
 *
 * ```typescript
 * import { createHaexHubClient } from '@haexhub/sdk';
 * // Polyfills are active!
 * ```
 *
 * You can also install them manually:
 *
 * ```typescript
 * import { installPolyfills } from '@haexhub/sdk/polyfills';
 * installPolyfills();
 * ```
 */

import { installLocalStoragePolyfill, installSessionStoragePolyfill } from './localStorage';
import { installCookiePolyfill } from './cookies';
import { installHistoryPolyfill } from './history';

export { installLocalStoragePolyfill, installSessionStoragePolyfill } from './localStorage';
export { installCookiePolyfill } from './cookies';
export { installHistoryPolyfill } from './history';
export { installBaseTag } from './baseTag'; // Export for backwards compatibility, but not used in auto-install
export { installConsoleForwarding } from './consoleForwarding';

/**
 * Install all HaexHub polyfills
 *
 * This function is called automatically when the SDK is imported.
 * You usually don't need to call this manually.
 */
export function installPolyfills(): void {
  if (typeof window === 'undefined') {
    return; // Skip in server-side environments
  }

  // Install localStorage and sessionStorage polyfills immediately
  // These need to be available before any app code runs
  installLocalStoragePolyfill();
  installSessionStoragePolyfill();

  // Install cookie polyfill immediately
  installCookiePolyfill();

  // Install history polyfill (waits for DOM ready internally)
  installHistoryPolyfill();

  // Note: Base tag is injected at build-time by Vite plugin, no runtime setup needed
  // Runtime base tag setup is disabled to prevent conflicts

  // Note: Console forwarding is installed by HaexHubClient when debug mode is enabled

  console.log('[HaexHub] All polyfills loaded successfully');

  // Debug: Test window.parent availability (for Android debugging)
  console.log('[HaexHub] DEBUG: Starting parent window test');
  try {
    console.log('[HaexHub] DEBUG: Checking window.parent existence');
    const hasParent = window.parent && window.parent !== window;
    console.log('[HaexHub] DEBUG: hasParent =', hasParent);
    const debugMsg = {
      type: 'haexhub:debug',
      data: `[Polyfills] window.parent exists: ${!!window.parent}, is different: ${hasParent}, self===top: ${window.self === window.top}`
    };
    if (hasParent) {
      console.log('[HaexHub] DEBUG: Attempting postMessage');
      window.parent.postMessage(debugMsg, '*');
      console.log('[HaexHub] DEBUG: postMessage sent');
    } else {
      console.log('[HaexHub] No parent window or parent === self');
    }
  } catch (e) {
    console.log('[HaexHub] postMessage to parent failed:', e);
  }
  console.log('[HaexHub] DEBUG: Parent window test complete');
}

// Auto-install polyfills when this module is imported
// This ensures extensions work out of the box without manual setup
if (typeof window !== 'undefined') {
  installPolyfills();
}
