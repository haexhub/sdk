// Core Protocol Types
export interface HaexHubRequest {
  method: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface HaexHubResponse<T = unknown> {
  id: string;
  result?: T;
  error?: HaexHubError;
}

export interface HaexHubError {
  code: string;
  message: string;
  details?: unknown;
}

// Extension Info (provided by HaexHub at runtime)
export interface ExtensionInfo {
  keyHash: string;
  name: string;
  fullId: string;
  version: string;
  displayName?: string;
  namespace?: string;
}

// Permission Types
export enum PermissionStatus {
  GRANTED = "granted",
  DENIED = "denied",
  ASK = "ask",
}

export interface PermissionResponse {
  status: PermissionStatus;
  permanent: boolean;
}

// Database Permission (matches Rust DbExtensionPermission)
export interface DatabasePermission {
  extensionId: string;
  resource: string;
  operation: "read" | "write";
  path: string;
}

export interface DatabasePermissionRequest {
  resource: string;
  operation: "read" | "write";
  reason?: string;
}

// Database Types
export interface DatabaseQueryParams {
  query: string;
  params?: unknown[];
}

export interface DatabaseQueryResult {
  rows: unknown[];
  rowsAffected: number;
  lastInsertId?: number;
}

export interface DatabaseExecuteParams {
  statements: string[];
}

export interface DatabaseTableInfo {
  name: string;
  columns: DatabaseColumnInfo[];
}

export interface DatabaseColumnInfo {
  name: string;
  type: string;
  notNull: boolean;
  defaultValue?: unknown;
  primaryKey: boolean;
}

// Event Types
export interface HaexHubEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

export type EventCallback = (event: HaexHubEvent) => void;

// Config Types
export interface HaexHubConfig {
  debug?: boolean;
  timeout?: number;
}

// Error Codes
export enum ErrorCode {
  PERMISSION_DENIED = "PERMISSION_DENIED",
  INVALID_PARAMS = "INVALID_PARAMS",
  METHOD_NOT_FOUND = "METHOD_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  TIMEOUT = "TIMEOUT",
  NOT_IN_IFRAME = "NOT_IN_IFRAME",
}
