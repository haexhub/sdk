/**
 * React Integration for HaexHub SDK
 *
 * Provides a React hook that automatically creates reactive state
 * for extension info and application context.
 *
 * @example
 * ```typescript
 * import { useHaexHub } from '@haexhub/sdk/react';
 *
 * function MyComponent() {
 *   const { extensionInfo, context, db, storage } = useHaexHub();
 *
 *   // Use directly in JSX - automatically reactive!
 *   return <div>{extensionInfo?.name}</div>;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { createHaexHubClient } from './index';
import { HaexHubClient } from './client';
import type { ExtensionInfo, ApplicationContext, HaexHubConfig } from './types';

// Shared SDK client instance - initialized once at module level
let clientInstance: HaexHubClient | null = null;

/**
 * React hook for HaexHub SDK
 *
 * Creates a singleton SDK client with reactive state that automatically
 * updates when the SDK receives new data from the parent application.
 *
 * @param config - Optional SDK configuration
 * @returns SDK instance with extensionInfo, context, db, and storage
 */
export function useHaexHub(config: HaexHubConfig = {}) {
  // Initialize SDK only once
  if (!clientInstance) {
    clientInstance = createHaexHubClient(config);
  }

  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(
    clientInstance.extensionInfo
  );
  const [context, setContext] = useState<ApplicationContext | null>(
    clientInstance.context
  );
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    // Subscribe to SDK changes
    const unsubscribe = clientInstance!.subscribe(() => {
      setExtensionInfo(clientInstance!.extensionInfo);
      setContext(clientInstance!.context);
      setIsSetupComplete(clientInstance!.setupCompleted);
    });

    // Initial sync in case data loaded before component mounted
    setExtensionInfo(clientInstance!.extensionInfo);
    setContext(clientInstance!.context);
    setIsSetupComplete(clientInstance!.setupCompleted);

    // Note: We DON'T call setupComplete() automatically anymore!
    // The extension must call it after registering the setup hook.
    // This prevents race conditions where setupComplete() is called before the hook is registered.

    return unsubscribe;
  }, []);

  return {
    client: clientInstance,
    extensionInfo,
    context,
    isSetupComplete,
    db: clientInstance.orm,
    storage: clientInstance.storage,
    getTableName: clientInstance.getTableName.bind(clientInstance),
  };
}

/**
 * Get the raw HaexHub client instance (non-reactive)
 * Useful for direct API calls without React state overhead
 */
export function getHaexHubClient(): HaexHubClient | null {
  return clientInstance;
}
