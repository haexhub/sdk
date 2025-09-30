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

import { HaexHubClient } from "./client";

export function createHaexHubClient(
  config: { debug?: boolean; timeout?: number } = {}
) {
  return new HaexHubClient(config);
}
