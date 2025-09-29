import { invoke } from "@tauri-apps/api/core";
import type { DatabaseListOptions } from "../types";

/**
 * Provides access to the database-related APIs in the HaexHub backend.
 * This class is not meant to be instantiated directly, but accessed through an instance of `HaexHubClient`.
 *
 * It assumes your Tauri backend has commands like:
 * - `plugin:database|get`
 * - `plugin:database|set`
 * - `plugin:database|remove`
 * - `plugin:database|list`
 */
export class DatabaseAPI {
  /**
   * Retrieves a value from the database by its key.
   * @param key The key of the record to retrieve.
   * @returns A promise that resolves to the value, or null if the key doesn't exist.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      return await invoke<T>("plugin:database|get", { key });
    } catch (error) {
      // It's common for Tauri to throw an error if the key is not found.
      // We'll normalize this to return null for a better developer experience.
      console.warn(`Could not retrieve key "${key}":`, error);
      return null;
    }
  }

  /**
   * Sets a value in the database for a given key.
   * @param key The key of the record to set.
   * @param value The value to store.
   * @returns A promise that resolves when the operation is complete.
   */
  async set<T>(key: string, value: T): Promise<void> {
    await invoke<void>("plugin:database|set", { key, value });
  }

  /**
   * Removes a record from the database by its key.
   * @param key The key of the record to remove.
   * @returns A promise that resolves when the operation is complete.
   */
  async remove(key: string): Promise<void> {
    await invoke<void>("plugin:database|remove", { key });
  }

  /**
   * Lists records from the database, optionally filtering them.
   * @param options Filtering options, e.g., to list records with a specific prefix.
   * @returns A promise that resolves to an array of records.
   */
  async list<T = unknown>(options?: DatabaseListOptions): Promise<T[]> {
    return await invoke<T[]>("plugin:database|list", { options });
  }
}
