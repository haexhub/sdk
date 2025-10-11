/**
 * Vue 3 Integration for HaexHub SDK
 *
 * Provides a Vue composable that automatically creates reactive refs
 * for extension info and application context.
 *
 * @example
 * ```typescript
 * import { useHaexHub } from '@haexhub/sdk/vue';
 *
 * const { extensionInfo, context, db, storage } = useHaexHub();
 *
 * // Use directly in templates - automatically reactive!
 * console.log(extensionInfo.value);
 * console.log(context.value);
 * ```
 */

import { ref, readonly } from 'vue';
import type { Ref } from 'vue';
import { createHaexHubClient } from './index';
import { HaexHubClient } from './client';
import type { ExtensionInfo, ApplicationContext } from './types';

// Shared reactive SDK instance - initialized once at module level
let clientInstance: HaexHubClient | null = null;
let extensionInfo: Ref<ExtensionInfo | null> | null = null;
let context: Ref<ApplicationContext | null> | null = null;

/**
 * Vue 3 composable for HaexHub SDK
 *
 * Creates a singleton SDK client with reactive properties that automatically
 * update when the SDK receives new data from the parent application.
 *
 * @param config - Optional SDK configuration
 * @returns Reactive SDK instance with extensionInfo, context, db, and storage
 */
export function useHaexHub(config: { debug?: boolean; timeout?: number } = {}) {
  // Initialize SDK only once
  if (!clientInstance) {
    clientInstance = createHaexHubClient(config);
    extensionInfo = ref<ExtensionInfo | null>(clientInstance.extensionInfo);
    context = ref<ApplicationContext | null>(clientInstance.context);

    // Subscribe to SDK changes and update reactive refs
    clientInstance.subscribe(() => {
      if (extensionInfo) {
        extensionInfo.value = clientInstance!.extensionInfo;
      }
      if (context) {
        context.value = clientInstance!.context;
      }
    });
  }

  return {
    client: clientInstance,
    extensionInfo: readonly(extensionInfo!),
    context: readonly(context!),
    db: clientInstance.db,
    storage: clientInstance.storage,
    getTableName: clientInstance.getTableName.bind(clientInstance),
  };
}

/**
 * Get the raw HaexHub client instance (non-reactive)
 * Useful for direct API calls without Vue reactivity overhead
 */
export function getHaexHubClient(): HaexHubClient | null {
  return clientInstance;
}
