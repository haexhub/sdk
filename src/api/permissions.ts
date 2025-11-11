import type { HaexHubClient } from "../client";
import type { PermissionResponse } from "../types";

export class PermissionsAPI {
  constructor(private client: HaexHubClient) {}

  /**
   * Checks if the extension has permission for a database operation
   * @param resource The database resource (table name or "*" for all tables)
   * @param operation The operation type ("read" or "write")
   * @returns Promise<boolean> indicating if permission is granted
   */
  async checkDatabaseAsync(
    resource: string,
    operation: "read" | "write"
  ): Promise<boolean> {
    const response = await this.client.request<PermissionResponse>(
      "permissions.database.check",
      {
        resource,
        operation,
      }
    );
    return response.status === "granted";
  }

  /**
   * Checks if the extension has permission for a web request
   * @param url The URL or domain to check (e.g., "https://example.com" or "example.com")
   * @param method The HTTP method (e.g., "GET", "POST", etc.). Defaults to "GET"
   * @returns Promise<boolean> indicating if permission is granted
   */
  async checkWebAsync(url: string, method: string = "GET"): Promise<boolean> {
    const response = await this.client.request<PermissionResponse>(
      "permissions.web.check",
      {
        url,
        method,
      }
    );
    return response.status === "granted";
  }

  /**
   * Checks if the extension has permission for a filesystem operation
   * @param path The file or directory path
   * @param operation The operation type ("read" or "write")
   * @returns Promise<boolean> indicating if permission is granted
   */
  async checkFilesystemAsync(
    path: string,
    operation: "read" | "write"
  ): Promise<boolean> {
    const response = await this.client.request<PermissionResponse>(
      "permissions.filesystem.check",
      {
        path,
        operation,
      }
    );
    return response.status === "granted";
  }
}
