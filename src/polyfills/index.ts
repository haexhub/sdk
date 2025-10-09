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
import { installBaseTag } from './baseTag';

export { installLocalStoragePolyfill, installSessionStoragePolyfill } from './localStorage';
export { installCookiePolyfill } from './cookies';
export { installHistoryPolyfill } from './history';
export { installBaseTag } from './baseTag';
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

  // Install base tag (waits for extension info from parent window)
  installBaseTag();

  // Note: Console forwarding is installed by HaexHubClient when debug mode is enabled

  console.log('[HaexHub] All polyfills loaded successfully');
}

// Auto-install polyfills when this module is imported
// This ensures extensions work out of the box without manual setup
if (typeof window !== 'undefined') {
  installPolyfills();
}
