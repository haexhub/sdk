/**
 * Svelte Integration for HaexHub SDK
 *
 * Provides Svelte stores that automatically update
 * for extension info and application context.
 *
 * @example
 * ```typescript
 * import { haexHub, extensionInfo, context } from '@haexhub/sdk/svelte';
 *
 * // In Svelte components - automatically reactive!
 * <script>
 *   console.log($extensionInfo);
 *   console.log($context);
 * </script>
 *
 * <div>{$extensionInfo?.name}</div>
 * ```
 */

import { writable, readonly as svelteReadonly } from 'svelte/store';
import type { Readable } from 'svelte/store';
import { createHaexHubClient } from './index';
import { HaexHubClient } from './client';
import type { ExtensionInfo, ApplicationContext } from './types';

// Shared SDK client instance - initialized once at module level
let clientInstance: HaexHubClient | null = null;

// Writable stores
const extensionInfoStore = writable<ExtensionInfo | null>(null);
const contextStore = writable<ApplicationContext | null>(null);

/**
 * Initialize the HaexHub SDK for Svelte
 *
 * Call this once at app startup (e.g., in your root +layout.svelte)
 *
 * @param config - Optional SDK configuration
 */
export function initHaexHub(config: { debug?: boolean; timeout?: number } = {}) {
  if (!clientInstance) {
    clientInstance = createHaexHubClient(config);

    // Set initial values
    extensionInfoStore.set(clientInstance.extensionInfo);
    contextStore.set(clientInstance.context);

    // Subscribe to SDK changes and update stores
    clientInstance.subscribe(() => {
      extensionInfoStore.set(clientInstance!.extensionInfo);
      contextStore.set(clientInstance!.context);
    });
  }

  return clientInstance;
}

/**
 * Svelte store for extension info (readonly)
 *
 * Subscribe using $extensionInfo in components
 */
export const extensionInfo: Readable<ExtensionInfo | null> = svelteReadonly(extensionInfoStore);

/**
 * Svelte store for application context (readonly)
 *
 * Subscribe using $context in components
 */
export const context: Readable<ApplicationContext | null> = svelteReadonly(contextStore);

/**
 * Get the raw HaexHub client instance
 *
 * Access db, storage, and other SDK methods
 */
export const haexHub = {
  get client(): HaexHubClient | null {
    return clientInstance;
  },
  get db() {
    if (!clientInstance) throw new Error('HaexHub SDK not initialized. Call initHaexHub() first.');
    return clientInstance.db;
  },
  get storage() {
    if (!clientInstance) throw new Error('HaexHub SDK not initialized. Call initHaexHub() first.');
    return clientInstance.storage;
  },
  getTableName(tableName: string): string {
    if (!clientInstance) throw new Error('HaexHub SDK not initialized. Call initHaexHub() first.');
    return clientInstance.getTableName(tableName);
  },
};

/**
 * Get the raw HaexHub client instance (non-reactive)
 * Useful for direct API calls without Svelte store overhead
 */
export function getHaexHubClient(): HaexHubClient | null {
  return clientInstance;
}
