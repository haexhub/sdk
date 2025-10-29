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
  DatabaseQueryResult,
} from "./types";
import {
  ErrorCode,
  DEFAULT_TIMEOUT,
  TABLE_SEPARATOR,
  HaexHubError,
} from "./types";
import { StorageAPI } from "./api/storage";
import { installConsoleForwarding } from "./polyfills/consoleForwarding";
import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";

export class HaexHubClient {
  private config: Required<Omit<HaexHubConfig, "manifest">> & {
    manifest?: HaexHubConfig["manifest"];
  };
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

  private readyPromise: Promise<void>;
  private resolveReady!: () => void; // Wird im Konstruktor initialisiert

  public db: SqliteRemoteDatabase<Record<string, unknown>> | null = null;
  public readonly storage: StorageAPI;

  constructor(config: HaexHubConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      manifest: config.manifest,
    };

    this.storage = new StorageAPI(this);

    // Install console forwarding if in debug mode
    installConsoleForwarding(this.config.debug);

    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });

    this.init();
  }

  /**
   * Gibt ein Promise zurück, das aufgelöst wird, sobald der Client
   * initialisiert ist und Extension-Infos empfangen hat.
   */
  public async ready(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Initialisiert die Drizzle-Datenbankinstanz.
   * Muss nach der Definition des Schemas aufgerufen werden.
   * @param schema Das Drizzle-Schemaobjekt (mit bereits geprefixten Tabellennamen).
   * @returns Die typsichere Drizzle-Datenbankinstanz.
   */
  public initializeDatabase<T extends Record<string, unknown>>(
    schema: T
  ): SqliteRemoteDatabase<T> {
    if (!this._extensionInfo) {
      throw new HaexHubError(
        ErrorCode.EXTENSION_INFO_UNAVAILABLE,
        "errors.client_not_ready"
      );
    }

    const dbInstance = drizzle<T>(
      async (
        sql: string,
        params: unknown[],
        method: "get" | "run" | "all" | "values"
      ) => {
        try {
          if (method === "run") {
            // 'run' (INSERT, UPDATE, DELETE) auf 'haextension.db.execute' mappen
            const result = await this.request<DatabaseQueryResult>(
              "haextension.db.execute",
              {
                query: sql,
                params: params as unknown[],
              }
            );
            // Drizzle erwartet { rowsAffected, lastInsertId }
            return result;
          }

          // 'get', 'all', 'values' mappen wir auf 'haextension.db.query'
          const result = await this.request<DatabaseQueryResult>("haextension.db.query", {
            query: sql,
            params: params as unknown[],
          });

          // Drizzle erwartet die rohen Daten-Arrays
          const rows = result.rows as any[];

          if (method === "get") {
            // 'get' will die erste Zeile oder null
            return rows[0] ?? null;
          }

          if (method === "values") {
            // 'values' will ein Array von Arrays (Zeilen -> Werte)
            return rows.map((row) => Object.values(row));
          }

          // 'all' will ein Array von Objekten (Zeilen)
          return rows;
        } catch (error) {
          // Wir nutzen this.log, wie du es implementiert hast
          this.log("Drizzle proxy error:", error);
          throw error; // Fehler an Drizzle weitergeben
        }
      },
      schema
    );

    this.db = dbInstance;
    return dbInstance;
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

    // Return table name wrapped in double quotes to handle special characters (like hyphens in extension names)
    return `"${publicKey}${TABLE_SEPARATOR}${extensionName}${TABLE_SEPARATOR}${tableName}"`;
  }

  public getDependencyTableName(
    publicKey: string,
    extensionName: string,
    tableName: string
  ): string {
    this.validatePublicKey(publicKey);
    this.validateExtensionName(extensionName);
    this.validateTableName(tableName);

    // Return table name wrapped in double quotes to handle special characters
    return `"${publicKey}${TABLE_SEPARATOR}${extensionName}${TABLE_SEPARATOR}${tableName}"`;
  }

  public parseTableName(fullTableName: string): {
    publicKey: string;
    extensionName: string;
    tableName: string;
  } | null {
    // Remove surrounding quotes if present
    let cleanTableName = fullTableName;
    if (cleanTableName.startsWith('"') && cleanTableName.endsWith('"')) {
      cleanTableName = cleanTableName.slice(1, -1);
    }

    const parts = cleanTableName.split(TABLE_SEPARATOR);

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

      // Use wildcard origin since extensions are sandboxed in their own protocol
      const targetOrigin = "*";
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
      // Load extension info from manifest (if provided in config)
      if (this.config.manifest) {
        this._extensionInfo = {
          publicKey: this.config.manifest.public_key,
          name: this.config.manifest.name,
          version: this.config.manifest.version,
          displayName: this.config.manifest.name,
        };
        this.log("Extension info loaded from manifest:", this._extensionInfo);
        this.notifySubscribers();

        this.emitEvent({
          type: "extension.info.loaded",
          data: { info: this._extensionInfo },
          timestamp: Date.now(),
        });
      }

      // Request context from HaexHub - this also acts as a handshake
      this._context = await this.request<ApplicationContext>("haextension.context.get");
      this.log("Application context received:", this._context);
      this.notifySubscribers();

      this.emitEvent({
        type: "context.loaded",
        data: { context: this._context },
        timestamp: Date.now(),
      });

      // +++ NEU: Signalisiert, dass der Client bereit ist +++
      this.resolveReady();
    } catch (error) {
      this.log("Failed to load extension info or context:", error);
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
      "[SDK Debug] Pending requests count:",
      this.pendingRequests.size
    );

    // Verify message comes from parent window (HaexHub)
    if (event.source !== window.parent) {
      console.error("[SDK Debug] ❌ REJECTED: Message not from parent window!");
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
    if (event.type === "haextension.context.changed") {
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
    if (
      !publicKey ||
      typeof publicKey !== "string" ||
      publicKey.trim() === ""
    ) {
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
