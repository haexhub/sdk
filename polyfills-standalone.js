/**
 * HaexHub Polyfills - Standalone Version
 *
 * Kopiere diese Datei in deine Extension und importiere sie VOR allen anderen Scripts:
 * <script src="./polyfills-standalone.js"></script>
 */

(function() {
  'use strict';

  console.log('[HaexHub] Storage Polyfill loading immediately');

  // localStorage Polyfill
  let localStorageWorks = false;
  try {
    const testKey = '__ls_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    localStorageWorks = true;
  } catch (e) {
    console.warn('[HaexHub] localStorage blocked – using in-memory fallback');
  }

  if (!localStorageWorks) {
    const lsStorage = new Map();
    const localStoragePoly = {
      getItem: function(key) {
        return lsStorage.get(key) || null;
      },
      setItem: function(key, value) {
        lsStorage.set(key, String(value));
      },
      removeItem: function(key) {
        lsStorage.delete(key);
      },
      clear: function() {
        lsStorage.clear();
      },
      get length() {
        return lsStorage.size;
      },
      key: function(index) {
        return Array.from(lsStorage.keys())[index] || null;
      }
    };

    try {
      Object.defineProperty(window, 'localStorage', {
        value: localStoragePoly,
        writable: true,
        configurable: true
      });
    } catch (e) {
      window.localStorage = localStoragePoly;
    }

    console.log('[HaexHub] localStorage replaced with in-memory polyfill');
  }

  // sessionStorage Polyfill
  try {
    const sessionStoragePoly = {
      getItem: function() { return null; },
      setItem: function() {},
      removeItem: function() {},
      clear: function() {},
      get length() { return 0; },
      key: function() { return null; }
    };

    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStoragePoly,
      writable: true,
      configurable: true
    });
  } catch (e) {
    window.sessionStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null
    };
  }

  console.log('[HaexHub] sessionStorage polyfill installed');

  // Cookie Polyfill
  let cookiesWork = false;
  try {
    document.cookie = '__cookie_test__=1';
    cookiesWork = document.cookie.indexOf('__cookie_test__') !== -1;
    document.cookie = '__cookie_test__=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (e) {
    console.warn('[HaexHub] Cookies blocked – using in-memory fallback');
  }

  if (!cookiesWork) {
    const cookieStore = new Map();

    Object.defineProperty(document, 'cookie', {
      get: function() {
        const cookies = [];
        cookieStore.forEach((value, key) => {
          cookies.push(`${key}=${value}`);
        });
        return cookies.join('; ');
      },
      set: function(cookieString) {
        const parts = cookieString.split(';').map(p => p.trim());
        const [keyValue] = parts;
        if (!keyValue) return;

        const [key, value] = keyValue.split('=');
        if (!key) return;

        const options = {};
        for (let i = 1; i < parts.length; i++) {
          const part = parts[i];
          if (!part) continue;
          const parts_split = part.split('=');
          const optKey = parts_split[0];
          const optValue = parts_split[1];
          if (optKey) {
            options[optKey.toLowerCase()] = optValue || true;
          }
        }

        const expiresValue = options.expires;
        if (expiresValue && typeof expiresValue === 'string') {
          const expiresDate = new Date(expiresValue);
          if (expiresDate < new Date()) {
            cookieStore.delete(key);
            return;
          }
        }

        const maxAgeValue = options['max-age'];
        if (typeof maxAgeValue === 'string' && maxAgeValue === '0') {
          cookieStore.delete(key);
          return;
        }

        cookieStore.set(key, value || '');
      },
      configurable: true
    });

    console.log('[HaexHub] Cookie polyfill installed');
  }

  // History API Polyfill
  const installHistoryPolyfill = function() {
    console.log('[HaexHub] History Patch loading');

    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    let skipNextPush = false;
    let skipNextReplace = false;

    history.pushState = function(state, title, url) {
      console.log('[HaexHub] pushState called:', url, 'skip:', skipNextPush);

      if (skipNextPush) {
        skipNextPush = false;
        console.log('[HaexHub] pushState skipped');
        return;
      }

      try {
        return originalPushState.call(this, state, title, url);
      } catch (e) {
        if (e.name === 'SecurityError' && url) {
          const urlString = url.toString();
          let hashUrl = urlString.replace(/^\/#/, '');
          hashUrl = hashUrl.startsWith('#') ? hashUrl : '#' + hashUrl;
          console.log('[HaexHub] SecurityError - setting hash to:', hashUrl);
          skipNextPush = true;
          window.location.hash = hashUrl.replace(/^#/, '');
          return;
        }
        throw e;
      }
    };

    history.replaceState = function(state, title, url) {
      console.log('[HaexHub] replaceState called:', url, 'skip:', skipNextReplace);

      if (skipNextReplace) {
        skipNextReplace = false;
        console.log('[HaexHub] replaceState skipped');
        return;
      }

      try {
        return originalReplaceState.call(this, state, title, url);
      } catch (e) {
        if (e.name === 'SecurityError' && url) {
          const urlString = url.toString();
          let hashUrl = urlString.replace(/^\/#/, '');
          hashUrl = hashUrl.startsWith('#') ? hashUrl : '#' + hashUrl;
          console.log('[HaexHub] SecurityError - setting hash to:', hashUrl);
          skipNextReplace = true;
          window.location.hash = hashUrl.replace(/^#/, '');
          return;
        }
        throw e;
      }
    };

    console.log('[HaexHub] History API patched');
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installHistoryPolyfill, { once: true });
  } else {
    installHistoryPolyfill();
  }

  console.log('[HaexHub] All polyfills loaded successfully');
})();
