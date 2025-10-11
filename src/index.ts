// Import and auto-install polyfills first
// This ensures localStorage, cookies, and history work in custom protocols
import './polyfills';

export { HaexHubClient } from "./client";
export { DatabaseAPI } from "./api/database";

export type {
  HaexHubRequest,
  HaexHubResponse,
  HaexHubConfig,
  HaexHubEvent,
  EventCallback,
  PermissionResponse,
  DatabasePermission,
  DatabasePermissionRequest,
  DatabaseQueryParams,
  DatabaseQueryResult,
  DatabaseExecuteParams,
  DatabaseTableInfo,
  DatabaseColumnInfo,
  ExtensionInfo,
  ApplicationContext,
  SearchQuery,
  SearchResult,
  ContextChangedEvent,
  SearchRequestEvent,
} from "./types";

export {
  PermissionStatus,
  ErrorCode,
  KEY_HASH_LENGTH,
  DEFAULT_TIMEOUT,
} from "./types";
export { HaexHubError } from "./types";

// Export polyfill utilities for manual control if needed
export {
  installPolyfills,
  installLocalStoragePolyfill,
  installSessionStoragePolyfill,
  installCookiePolyfill,
  installHistoryPolyfill,
  installBaseTag,
} from './polyfills';

import { HaexHubClient } from "./client";
import type { ExtensionInfo, ApplicationContext } from "./types";

export function createHaexHubClient(
  config: { debug?: boolean; timeout?: number } = {}
) {
  return new HaexHubClient(config);
}

// Generic ref interface that works with both Vue and our fallback
export interface Ref<T> {
  value: T;
}

export interface ReadonlyRef<T> {
  readonly value: T;
}

/**
 * Creates a reactive wrapper around SDK data that integrates with Vue's reactivity system.
 * This function should be called once at module level to create shared reactive state.
 *
 * @param client - The HaexHubClient instance
 * @returns Reactive refs for extensionInfo and context that auto-update
 *
 * @example
 * ```typescript
 * import { createHaexHubClient, createReactiveSDK } from '@haexhub/sdk';
 *
 * const client = createHaexHubClient({ debug: true });
 * const { extensionInfo, context } = createReactiveSDK(client);
 *
 * // Use directly in templates or computed properties
 * console.log(extensionInfo.value);
 * console.log(context.value);
 * ```
 */
export function createReactiveSDK(client: HaexHubClient) {
  // Import Vue's ref dynamically to avoid hard dependency
  let ref: <T>(value: T) => Ref<T>;
  let readonly: <T>(ref: Ref<T>) => ReadonlyRef<T>;

  try {
    // Try to import from Vue 3
    const vue = require('vue');
    ref = vue.ref;
    readonly = vue.readonly;
  } catch {
    // Fallback: Create simple reactive wrapper if Vue is not available
    ref = <T>(initialValue: T): Ref<T> => {
      let value = initialValue;
      return {
        get value() {
          return value;
        },
        set value(newValue: T) {
          value = newValue;
        }
      };
    };

    readonly = <T>(r: Ref<T>): ReadonlyRef<T> => ({
      get value() { return r.value; }
    });
  }

  const extensionInfo = ref<ExtensionInfo | null>(client.extensionInfo);
  const context = ref<ApplicationContext | null>(client.context);

  // Subscribe to SDK changes
  client.subscribe(() => {
    extensionInfo.value = client.extensionInfo;
    context.value = client.context;
  });

  return {
    client,
    extensionInfo: readonly(extensionInfo),
    context: readonly(context),
    db: client.db,
    storage: client.storage,
    getTableName: client.getTableName.bind(client),
  };
}
