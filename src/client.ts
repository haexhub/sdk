import { DatabaseAPI } from "./api/database";
import type { ClientOptions } from "./types";

/**
 * The main client for interacting with the HaexHub Tauri application.
 */
export class HaexHubClient {
  /**
   * Access database-related functionality.
   */
  public readonly database: DatabaseAPI;

  /**
   * Creates a new instance of the HaexHubClient.
   * @param options Configuration options for the client.
   */
  constructor(options?: ClientOptions) {
    // Initialize API modules
    this.database = new DatabaseAPI();

    // You can add more API modules here as your SDK grows
    // e.g., this.projects = new ProjectsAPI();
  }
}
