/**
 * Configuration options for the HaexHubClient.
 * (Currently empty, but can be expanded later).
 */
export interface ClientOptions {}

/**
 * Represents a generic project within HaexHub.
 * This is a sample type and should be adjusted to match your actual data model.
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: string; // ISO 8601 date string
  lastAccessedAt?: string; // ISO 8601 date string
}

/**
 * Options for listing records from the database.
 */
export interface DatabaseListOptions {
  /**
   * If provided, only records whose keys start with this string will be returned.
   */
  startsWith?: string;
}
