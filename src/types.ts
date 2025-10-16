// Constants
export const DEFAULT_TIMEOUT = 30000; // 30 seconds in milliseconds
export const TABLE_SEPARATOR = "__"; // Separator for table name components: {publicKey}__{extensionName}__{tableName}

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
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// Extension Info (provided by HaexHub at runtime)
export interface ExtensionInfo {
  publicKey: string;
  name: string;
  version: string;
  displayName?: string;
  namespace?: string;
  allowedOrigin: string;
}

// Application Context (provided by HaexHub)
export interface ApplicationContext {
  theme: "light" | "dark" | "system";
  locale: string;
  platform:
    | "linux"
    | "macos"
    | "ios"
    | "freebsd"
    | "dragonfly"
    | "netbsd"
    | "openbsd"
    | "solaris"
    | "android"
    | "windows"
    | undefined;
}

// Search Types
export interface SearchQuery {
  query: string;
  filters?: Record<string, unknown>;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: string;
  data?: Record<string, unknown>;
  score?: number;
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

// Specific Event Types
export interface ContextChangedEvent extends HaexHubEvent {
  type: "context.changed";
  data: {
    context: ApplicationContext;
  };
}

export interface SearchRequestEvent extends HaexHubEvent {
  type: "search.request";
  data: {
    query: SearchQuery;
    requestId: string;
  };
}

export type EventCallback = (event: HaexHubEvent) => void;

// Config Types
export interface HaexHubConfig {
  debug?: boolean;
  timeout?: number;
}

// Error Codes
export enum ErrorCode {
  // Connection Errors
  TIMEOUT = "TIMEOUT",
  NOT_IN_IFRAME = "NOT_IN_IFRAME",
  UNAUTHORIZED_ORIGIN = "UNAUTHORIZED_ORIGIN",

  // Permission Errors
  PERMISSION_DENIED = "PERMISSION_DENIED",

  // Validation Errors
  INVALID_PUBLIC_KEY = "INVALID_PUBLIC_KEY",
  INVALID_EXTENSION_NAME = "INVALID_EXTENSION_NAME",
  INVALID_TABLE_NAME = "INVALID_TABLE_NAME",
  INVALID_PARAMS = "INVALID_PARAMS",

  // Extension Errors
  EXTENSION_NOT_INITIALIZED = "EXTENSION_NOT_INITIALIZED",
  EXTENSION_INFO_UNAVAILABLE = "EXTENSION_INFO_UNAVAILABLE",

  // API Errors
  METHOD_NOT_FOUND = "METHOD_NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
}

export class HaexHubError extends Error {
  constructor(
    public code: ErrorCode,
    public messageKey: string,
    public details?: Record<string, unknown>
  ) {
    super(messageKey);
    this.name = "HaexHubError";
  }

  /**
   * Get localized error message
   * @param locale - Locale code (e.g., 'en', 'de')
   * @param translations - Translation object
   */
  getLocalizedMessage(
    locale: string = "en",
    translations?: Record<string, Record<string, string>>
  ): string {
    if (!translations || !translations[locale]) {
      return this.messageKey;
    }

    let message = translations[locale][this.messageKey] || this.messageKey;

    // Replace placeholders with details
    if (this.details) {
      Object.entries(this.details).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }

    return message;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.messageKey,
      details: this.details,
    };
  }
}
