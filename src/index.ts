export { HaexHubClient } from "./client";
export { DatabaseAPI } from "./api/database";

export type {
  HaexHubRequest,
  HaexHubResponse,
  HaexHubError,
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
} from "./types";

export { PermissionStatus, ErrorCode } from "./types";

import { HaexHubClient } from "./client";

export function createHaexHubClient(
  config: { debug?: boolean; timeout?: number } = {}
) {
  return new HaexHubClient(config);
}
