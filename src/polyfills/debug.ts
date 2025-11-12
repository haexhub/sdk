/**
 * Debug diagnostics for Android debugging
 * Tests window.parent availability and postMessage functionality
 */
export function installDebugDiagnostics(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const hasParent = window.parent && window.parent !== window;
  console.log('[HaexHub] hasParent:', hasParent);

  if (hasParent) {
    console.log('[HaexHub] Attempting to send debug message to parent...');
    window.parent.postMessage({
      type: 'haexhub:debug',
      data: `[Polyfills] window.parent test: exists=${!!window.parent}, different=${hasParent}, selfIsTop=${window.self === window.top}`
    }, '*');
    console.log('[HaexHub] Debug message sent!');
  } else {
    console.log('[HaexHub] No parent window or parent === window');
  }
}
