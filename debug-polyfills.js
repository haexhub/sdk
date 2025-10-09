/**
 * HaexHub SDK Polyfill Debug Script
 *
 * Füge dieses Script NACH dem SDK-Import in deine Extension ein:
 *
 * ```typescript
 * import { createHaexHubClient } from '@haexhub/sdk';
 * // Polyfills should be active now
 *
 * // Run debug checks
 * console.log(window.__haexhubPolyfillStatus());
 * ```
 */

window.__haexhubPolyfillStatus = function() {
  const results = {
    timestamp: new Date().toISOString(),
    localStorage: {
      available: false,
      isPolyfill: false,
      test: null
    },
    sessionStorage: {
      available: false,
      isPolyfill: false,
      test: null
    },
    cookies: {
      available: false,
      isPolyfill: false,
      test: null
    },
    history: {
      available: false,
      isPatched: false
    },
    summary: {
      allWorking: false,
      polyfillsActive: false
    }
  };

  // Test localStorage
  try {
    const testKey = '__haexhub_test__';
    localStorage.setItem(testKey, 'test');
    const value = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    results.localStorage.available = true;
    results.localStorage.test = value === 'test' ? 'PASS' : 'FAIL';

    // Check if it's our polyfill (Map-based)
    try {
      results.localStorage.isPolyfill =
        localStorage.constructor.name !== 'Storage' ||
        localStorage.toString().includes('Map');
    } catch (e) {
      results.localStorage.isPolyfill = false;
    }
  } catch (e) {
    results.localStorage.available = false;
    results.localStorage.error = e.message;
  }

  // Test sessionStorage
  try {
    sessionStorage.setItem('test', 'value');
    const value = sessionStorage.getItem('test');

    results.sessionStorage.available = true;
    results.sessionStorage.test = value === null ? 'NO-OP (Expected)' : 'ACTIVE';
    results.sessionStorage.isPolyfill = value === null;
  } catch (e) {
    results.sessionStorage.available = false;
    results.sessionStorage.error = e.message;
  }

  // Test cookies
  try {
    const testCookie = '__haexhub_cookie_test__';
    document.cookie = `${testCookie}=test`;
    const hasCookie = document.cookie.includes(testCookie);

    results.cookies.available = true;
    results.cookies.test = hasCookie ? 'PASS' : 'BLOCKED';

    // Check if it's our polyfill
    const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                      Object.getOwnPropertyDescriptor(document, 'cookie');
    results.cookies.isPolyfill = descriptor?.configurable === true;

    // Cleanup
    document.cookie = `${testCookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  } catch (e) {
    results.cookies.available = false;
    results.cookies.error = e.message;
  }

  // Check history API
  try {
    results.history.available = typeof history !== 'undefined';

    // Check if pushState/replaceState are patched
    const pushStateStr = history.pushState.toString();
    const replaceStateStr = history.replaceState.toString();

    results.history.isPatched =
      pushStateStr.includes('SecurityError') ||
      pushStateStr.includes('[HaexHub]') ||
      pushStateStr.length > 100; // Patched functions are longer
  } catch (e) {
    results.history.available = false;
    results.history.error = e.message;
  }

  // Summary
  results.summary.allWorking =
    results.localStorage.available &&
    results.sessionStorage.available &&
    results.cookies.available &&
    results.history.available;

  results.summary.polyfillsActive =
    results.localStorage.isPolyfill ||
    results.sessionStorage.isPolyfill ||
    results.cookies.isPolyfill ||
    results.history.isPatched;

  return results;
};

// Auto-run check if called directly
if (typeof window !== 'undefined') {
  console.log('=== HaexHub Polyfill Status ===');
  const status = window.__haexhubPolyfillStatus();
  console.table({
    'localStorage': {
      Available: status.localStorage.available,
      Polyfill: status.localStorage.isPolyfill,
      Test: status.localStorage.test || 'N/A'
    },
    'sessionStorage': {
      Available: status.sessionStorage.available,
      Polyfill: status.sessionStorage.isPolyfill,
      Test: status.sessionStorage.test || 'N/A'
    },
    'Cookies': {
      Available: status.cookies.available,
      Polyfill: status.cookies.isPolyfill,
      Test: status.cookies.test || 'N/A'
    },
    'History API': {
      Available: status.history.available,
      Patched: status.history.isPatched,
      Test: 'N/A'
    }
  });

  console.log('\n📊 Summary:');
  console.log(`✓ All APIs working: ${status.summary.allWorking}`);
  console.log(`✓ Polyfills active: ${status.summary.polyfillsActive}`);

  if (!status.summary.polyfillsActive) {
    console.warn('⚠️ No polyfills detected! Either:');
    console.warn('  1. Native APIs are working (good!)');
    console.warn('  2. SDK not imported correctly (check imports)');
  }

  console.log('\nFull status object:', status);
  console.log('=================================');
}
