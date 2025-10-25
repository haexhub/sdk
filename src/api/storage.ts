import type { HaexHubClient } from "~/client";

export class StorageAPI {
  constructor(private client: HaexHubClient) {}

  async getItem(key: string): Promise<string | null> {
    return this.client.request<string | null>("haextension.storage.getItem", { key });
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.client.request("haextension.storage.setItem", { key, value });
  }

  async removeItem(key: string): Promise<void> {
    await this.client.request("haextension.storage.removeItem", { key });
  }

  async clear(): Promise<void> {
    await this.client.request("haextension.storage.clear");
  }

  async keys(): Promise<string[]> {
    return this.client.request<string[]>("haextension.storage.keys");
  }
}
