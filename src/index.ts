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
  DEFAULT_TIMEOUT,
  TABLE_SEPARATOR,
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

// Export config utilities
export {
  readHaextensionConfig,
  getExtensionDir,
  type HaextensionConfig,
} from './config';

import { HaexHubClient } from "./client";
import type { HaexHubConfig } from "./types";

export function createHaexHubClient(
  config: HaexHubConfig = {}
) {
  return new HaexHubClient(config);
}
