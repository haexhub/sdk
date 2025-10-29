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

  useEffect(() => {
    // Subscribe to SDK changes
    const unsubscribe = clientInstance!.subscribe(() => {
      setExtensionInfo(clientInstance!.extensionInfo);
      setContext(clientInstance!.context);
    });

    // Initial sync in case data loaded before component mounted
    setExtensionInfo(clientInstance!.extensionInfo);
    setContext(clientInstance!.context);

    return unsubscribe;
  }, []);

  return {
    client: clientInstance,
    extensionInfo,
    context,
    db: clientInstance.db,
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
