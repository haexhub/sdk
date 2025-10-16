import type {
  HaexHubRequest,
  HaexHubResponse,
  HaexHubConfig,
  HaexHubEvent,
  EventCallback,
  PermissionResponse,
  DatabasePermissionRequest,
  ExtensionInfo,
  ApplicationContext,
  SearchResult,
  ContextChangedEvent,
} from "./types";
import {
  ErrorCode,
  DEFAULT_TIMEOUT,
  TABLE_SEPARATOR,
  HaexHubError,
} from "./types";
import { DatabaseAPI } from "./api/database";
import { StorageAPI } from "./api/storage";
import { installConsoleForwarding } from "./polyfills/consoleForwarding";

export class HaexHubClient {
  private config: Required<HaexHubConfig>;
  private pendingRequests: Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private initialized = false;
  private requestCounter = 0;
  private _extensionInfo: ExtensionInfo | null = null;
  private _context: ApplicationContext | null = null;
  private reactiveSubscribers: Set<() => void> = new Set();

  public readonly db: DatabaseAPI;
  public readonly storage: StorageAPI;

  constructor(config: HaexHubConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
    };

    this.db = new DatabaseAPI(this);
    this.storage = new StorageAPI(this);

    // Install console forwarding if in debug mode
    installConsoleForwarding(this.config.debug);

    this.init();
  }

  public get extensionInfo(): ExtensionInfo | null {
    return this._extensionInfo;
  }

  public get context(): ApplicationContext | null {
    return this._context;
  }

  public subscribe(callback: () => void): () => void {
    this.reactiveSubscribers.add(callback);
    return () => {
      this.reactiveSubscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.reactiveSubscribers.forEach((callback) => callback());
  }

  public async getDependencies(): Promise<ExtensionInfo[]> {
    return this.request<ExtensionInfo[]>("extensions.getDependencies");
  }

  public getTableName(tableName: string): string {
    if (!this._extensionInfo) {
      throw new HaexHubError(
        ErrorCode.EXTENSION_INFO_UNAVAILABLE,
        "errors.extension_info_unavailable"
      );
    }

    this.validateTableName(tableName);

    const { publicKey, name } = this._extensionInfo;
    const extensionName = name;

    return `${publicKey}${TABLE_SEPARATOR}${extensionName}${TABLE_SEPARATOR}${tableName}`;
  }

  public getDependencyTableName(
    publicKey: string,
    extensionName: string,
    tableName: string
  ): string {
    this.validatePublicKey(publicKey);
    this.validateExtensionName(extensionName);
    this.validateTableName(tableName);

    return `${publicKey}${TABLE_SEPARATOR}${extensionName}${TABLE_SEPARATOR}${tableName}`;
  }

  public parseTableName(fullTableName: string): {
    publicKey: string;
    extensionName: string;
    tableName: string;
  } | null {
    const parts = fullTableName.split(TABLE_SEPARATOR);

    if (parts.length !== 3) {
      return null;
    }

    const [publicKey, extensionName, tableName] = parts;

    if (!publicKey || !extensionName || !tableName) {
      return null;
    }

    return {
      publicKey,
      extensionName,
      tableName,
    };
  }

  public async requestDatabasePermission(
    request: DatabasePermissionRequest
  ): Promise<PermissionResponse> {
    return this.request<PermissionResponse>("permissions.database.request", {
      resource: request.resource,
      operation: request.operation,
      reason: request.reason,
    });
  }

  public async checkDatabasePermission(
    resource: string,
    operation: "read" | "write"
  ): Promise<boolean> {
    const response = await this.request<PermissionResponse>(
      "permissions.database.check",
      {
        resource,
        operation,
      }
    );
    return response.status === "granted";
  }

  public async respondToSearch(
    requestId: string,
    results: SearchResult[]
  ): Promise<void> {
    await this.request("search.respond", {
      requestId,
      results,
    });
  }

  public async request<T = unknown>(
    method: string,
    params: Record<string, unknown> = {}
  ): Promise<T> {
    const requestId = this.generateRequestId();

    const request: HaexHubRequest = {
      method,
      params,
      timestamp: Date.now(),
    };

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(
          new HaexHubError(ErrorCode.TIMEOUT, "errors.timeout", {
            timeout: this.config.timeout,
          })
        );
      }, this.config.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      const targetOrigin = this._extensionInfo?.allowedOrigin || "*";
      console.log("[SDK Debug] ========== Sending Request ==========");
      console.log("[SDK Debug] Request ID:", requestId);
      console.log("[SDK Debug] Method:", request.method);
      console.log("[SDK Debug] Params:", request.params);
      console.log("[SDK Debug] Target origin:", targetOrigin);
      console.log("[SDK Debug] Extension info:", this._extensionInfo);
      console.log("[SDK Debug] ========================================");

      window.parent.postMessage({ id: requestId, ...request }, targetOrigin);
    });
  }

  public on(eventType: string, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  public off(eventType: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  public destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
    }

    this.pendingRequests.forEach(({ timeout }) => clearTimeout(timeout));
    this.pendingRequests.clear();
    this.eventListeners.clear();

    this.initialized = false;
    this.log("HaexHub SDK destroyed");
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    if (window.self === window.top) {
      throw new HaexHubError(ErrorCode.NOT_IN_IFRAME, "errors.not_in_iframe");
    }

    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener("message", this.messageHandler);

    this.initialized = true;
    this.log("HaexHub SDK initialized");

    try {
      this._extensionInfo = await this.request<ExtensionInfo>(
        "extension.getInfo"
      );
      this.log("Extension info received:", this._extensionInfo);
      this.notifySubscribers();

      this.emitEvent({
        type: "extension.info.loaded",
        data: { info: this._extensionInfo },
        timestamp: Date.now(),
      });
      this._context = await this.request<ApplicationContext>("context.get");
      this.log("Application context received:", this._context);
      this.notifySubscribers();

      this.emitEvent({
        type: "context.loaded",
        data: { context: this._context },
        timestamp: Date.now(),
      });
    } catch (error) {
      this.log("Failed to get extension info or context:", error);
    }
  }

  private handleMessage(event: MessageEvent): void {
    console.log("[SDK Debug] ========== Message Received ==========");
    console.log("[SDK Debug] Event origin:", event.origin);
    console.log(
      "[SDK Debug] Event source:",
      event.source === window.parent ? "parent window" : "unknown"
    );
    console.log("[SDK Debug] Event data:", event.data);
    console.log("[SDK Debug] Extension info loaded:", !!this._extensionInfo);
    console.log(
      "[SDK Debug] Allowed origin:",
      this._extensionInfo?.allowedOrigin
    );
    console.log(
      "[SDK Debug] Origins match:",
      event.origin === this._extensionInfo?.allowedOrigin
    );
    console.log(
      "[SDK Debug] Pending requests count:",
      this.pendingRequests.size
    );

    if (
      this._extensionInfo &&
      event.origin !== this._extensionInfo.allowedOrigin
    ) {
      console.error("[SDK Debug] ❌ REJECTED: Origin mismatch!");
      console.error("[SDK Debug] Expected:", this._extensionInfo.allowedOrigin);
      console.error("[SDK Debug] Got:", event.origin);
      return;
    }

    const data = event.data as HaexHubResponse | HaexHubEvent;

    if ("id" in data && this.pendingRequests.has(data.id)) {
      console.log("[SDK Debug] ✅ Found pending request for ID:", data.id);
      const pending = this.pendingRequests.get(data.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(data.id);

      if (data.error) {
        console.error("[SDK Debug] ❌ Request failed:", data.error);
        pending.reject(data.error);
      } else {
        console.log("[SDK Debug] ✅ Request succeeded:", data.result);
        pending.resolve(data.result);
      }
      return;
    }

    if ("id" in data && !this.pendingRequests.has(data.id)) {
      console.warn(
        "[SDK Debug] ⚠️ Received response for unknown request ID:",
        data.id
      );
      console.warn(
        "[SDK Debug] Known IDs:",
        Array.from(this.pendingRequests.keys())
      );
    }

    if ("type" in data && data.type) {
      console.log("[SDK Debug] Event received:", data.type);
      this.handleEvent(data as HaexHubEvent);
    }

    console.log("[SDK Debug] ========== End Message ==========");
  }

  private handleEvent(event: HaexHubEvent): void {
    if (event.type === "context.changed") {
      const contextEvent = event as ContextChangedEvent;
      this._context = contextEvent.data.context;
      this.log("Context updated:", this._context);
      this.notifySubscribers();
    }

    this.emitEvent(event);
  }

  private emitEvent(event: HaexHubEvent): void {
    this.log("Event received:", event);
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => callback(event));
    }
  }

  private generateRequestId(): string {
    return `req_${++this.requestCounter}`;
  }

  private validatePublicKey(publicKey: string): void {
    if (!publicKey || typeof publicKey !== "string" || publicKey.trim() === "") {
      throw new HaexHubError(
        ErrorCode.INVALID_PUBLIC_KEY,
        "errors.invalid_public_key",
        { publicKey }
      );
    }
  }

  private validateExtensionName(extensionName: string): void {
    if (!extensionName || !/^[a-z][a-z0-9-]*$/i.test(extensionName)) {
      throw new HaexHubError(
        ErrorCode.INVALID_EXTENSION_NAME,
        "errors.invalid_extension_name",
        { extensionName }
      );
    }

    if (extensionName.includes(TABLE_SEPARATOR)) {
      throw new HaexHubError(
        ErrorCode.INVALID_EXTENSION_NAME,
        "errors.extension_name_contains_separator",
        { extensionName, separator: TABLE_SEPARATOR }
      );
    }
  }

  private validateTableName(tableName: string): void {
    if (!tableName || typeof tableName !== "string") {
      throw new HaexHubError(
        ErrorCode.INVALID_TABLE_NAME,
        "errors.table_name_empty"
      );
    }

    if (tableName.includes(TABLE_SEPARATOR)) {
      throw new HaexHubError(
        ErrorCode.INVALID_TABLE_NAME,
        "errors.table_name_contains_separator",
        { tableName, separator: TABLE_SEPARATOR }
      );
    }

    if (!/^[a-z][a-z0-9-_]*$/i.test(tableName)) {
      throw new HaexHubError(
        ErrorCode.INVALID_TABLE_NAME,
        "errors.table_name_format",
        { tableName }
      );
    }
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log("[HaexHub SDK]", ...args);
    }
  }
}
