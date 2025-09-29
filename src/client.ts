import type {
  HaexHubRequest,
  HaexHubResponse,
  HaexHubConfig,
  HaexHubEvent,
  EventCallback,
  PermissionResponse,
  DatabasePermissionRequest,
  ExtensionInfo,
} from "./types";
import { ErrorCode } from "./types";
import { DatabaseAPI } from "./api/database";

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

  public readonly db: DatabaseAPI;

  constructor(config: HaexHubConfig = {}) {
    this.config = {
      debug: config.debug ?? false,
      timeout: config.timeout ?? 30000,
    };

    this.db = new DatabaseAPI(this);

    this.init();
  }

  public get extensionInfo(): ExtensionInfo | null {
    return this._extensionInfo;
  }

  public getTableName(tableName: string): string {
    if (!this._extensionInfo) {
      throw new Error(
        "Extension info not available yet. Make sure the client is initialized."
      );
    }

    const { keyHash, name } = this._extensionInfo;
    const namePrefix = name.replace(/-/g, "_");

    return `${keyHash}_${namePrefix}_${tableName}`;
  }

  public getDependencyTableName(
    keyHash: string,
    extensionName: string,
    tableName: string
  ): string {
    const namePrefix = extensionName.replace(/-/g, "_");

    return `${keyHash}_${namePrefix}_${tableName}`;
  }

  public parseTableName(fullTableName: string): {
    keyHash: string;
    extensionName: string;
    tableName: string;
  } | null {
    const parts = fullTableName.split("_");

    if (parts.length < 3) {
      return null;
    }

    const keyHash = parts[0];

    if (!keyHash || !/^[a-f0-9]{20}$/i.test(keyHash)) {
      return null;
    }

    const tableName = parts[parts.length - 1];
    if (!tableName) {
      return null;
    }

    const extensionNameParts = parts.slice(1, -1);
    if (extensionNameParts.length === 0) {
      return null;
    }

    const extensionName = extensionNameParts.join("-");

    return {
      keyHash,
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
    request: Omit<DatabasePermissionRequest, "reason">
  ): Promise<boolean> {
    const response = await this.request<PermissionResponse>(
      "permissions.database.check",
      {
        resource: request.resource,
        operation: request.operation,
      }
    );
    return response.status === "granted";
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    if (window.self === window.top) {
      throw new Error(ErrorCode.NOT_IN_IFRAME);
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
    } catch (error) {
      this.log("Failed to get extension info:", error);
    }
  }

  private handleMessage(event: MessageEvent): void {
    const data = event.data as HaexHubResponse | HaexHubEvent;

    if ("id" in data && this.pendingRequests.has(data.id)) {
      const pending = this.pendingRequests.get(data.id)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(data.id);

      if (data.error) {
        pending.reject(data.error);
      } else {
        pending.resolve(data.result);
      }
      return;
    }

    if ("type" in data && data.type) {
      this.emitEvent(data as HaexHubEvent);
    }
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
        reject({
          code: ErrorCode.TIMEOUT,
          message: `Request timeout after ${this.config.timeout}ms`,
        });
      }, this.config.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      this.log("Sending request:", request);
      window.parent.postMessage({ id: requestId, ...request }, "*");
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

  private emitEvent(event: HaexHubEvent): void {
    this.log("Event received:", event);
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((callback) => callback(event));
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

  private generateRequestId(): string {
    return `req_${++this.requestCounter}`;
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log("[HaexHub SDK]", ...args);
    }
  }
}
