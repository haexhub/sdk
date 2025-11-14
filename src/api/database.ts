import type { HaexHubClient } from "../client";
import type { DatabaseQueryResult, DatabaseTableInfo } from "../types";
import { HAEXTENSION_METHODS } from "../methods";

export class DatabaseAPI {
  constructor(private client: HaexHubClient) {}

  async query<T>(query: string, params?: unknown[]): Promise<T[]> {
    const result = await this.client.request<DatabaseQueryResult>(
      HAEXTENSION_METHODS.database.query,
      {
        query,
        params: params || [],
      }
    );

    return result.rows as T[];
  }

  async queryOne<T = unknown>(
    query: string,
    params?: unknown[]
  ): Promise<T | null> {
    const rows = await this.query<T>(query, params);
    return rows.length > 0 ? rows[0] ?? null : null;
  }

  async execute(
    query: string,
    params?: unknown[]
  ): Promise<DatabaseQueryResult> {
    return this.client.request<DatabaseQueryResult>(HAEXTENSION_METHODS.database.execute, {
      query,
      params: params || [],
    });
  }

  async transaction(statements: string[]): Promise<void> {
    await this.client.request(HAEXTENSION_METHODS.database.transaction, {
      statements,
    });
  }

  async createTable(tableName: string, columns: string): Promise<void> {
    const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columns})`;
    await this.execute(query);
  }

  async dropTable(tableName: string): Promise<void> {
    const query = `DROP TABLE IF EXISTS ${tableName}`;
    await this.execute(query);
  }

  async tableExists(tableName: string): Promise<boolean> {
    const result = await this.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?`,
      [tableName]
    );
    return result ? result.count > 0 : false;
  }

  async getTableInfo(tableName: string): Promise<DatabaseTableInfo | null> {
    interface PragmaResult {
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: unknown;
      pk: number;
    }

    const columns = await this.query<PragmaResult>(
      `PRAGMA table_info(${tableName})`
    );

    if (columns.length === 0) {
      return null;
    }

    return {
      name: tableName,
      columns: columns.map((col) => ({
        name: col.name,
        type: col.type,
        notNull: col.notnull === 1,
        defaultValue: col.dflt_value,
        primaryKey: col.pk === 1,
      })),
    };
  }

  async listTables(): Promise<string[]> {
    const result = await this.query<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
    );
    return result.map((row) => row.name);
  }

  async insert(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => "?").join(", ");

    const query = `INSERT INTO ${tableName} (${keys.join(
      ", "
    )}) VALUES (${placeholders})`;
    const result = await this.execute(query, values);

    return result.lastInsertId ?? -1;
  }

  async update(
    tableName: string,
    data: Record<string, unknown>,
    where: string,
    whereParams?: unknown[]
  ): Promise<number> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key) => `${key} = ?`).join(", ");

    const query = `UPDATE ${tableName} SET ${setClause} WHERE ${where}`;
    const result = await this.execute(query, [
      ...values,
      ...(whereParams || []),
    ]);

    return result.rowsAffected;
  }

  async delete(
    tableName: string,
    where: string,
    whereParams?: unknown[]
  ): Promise<number> {
    const query = `DELETE FROM ${tableName} WHERE ${where}`;
    const result = await this.execute(query, whereParams);
    return result.rowsAffected;
  }

  async count(
    tableName: string,
    where?: string,
    whereParams?: unknown[]
  ): Promise<number> {
    const query = where
      ? `SELECT COUNT(*) as count FROM ${tableName} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${tableName}`;

    const result = await this.queryOne<{ count: number }>(query, whereParams);
    return result?.count ?? 0;
  }

  /**
   * Runs database migrations for an extension
   * @param extensionPublicKey - The public key of the extension
   * @param extensionName - The name of the extension
   * @param migrations - Array of migration objects with name and SQL content
   * @returns Promise that resolves when all migrations are applied
   */
  async runMigrationsAsync(
    extensionPublicKey: string,
    extensionName: string,
    migrations: Array<{ name: string; sql: string }>
  ): Promise<void> {
    const tablePrefix = `${extensionPublicKey}__${extensionName}`;
    const migrationsTableName = `${tablePrefix}__migrations`;

    console.log(`[SDK] Running migrations for extension ${extensionName}`);

    try {
      // Create migrations tracking table if it doesn't exist
      await this.execute(`
        CREATE TABLE IF NOT EXISTS "${migrationsTableName}" (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          applied_at INTEGER NOT NULL
        )
      `);

      // Get already applied migrations
      const appliedMigrations = await this.query<{ name: string }>(
        `SELECT name FROM "${migrationsTableName}"`
      );
      // Handle both object format {name: "..."} and array format ["..."]
      const appliedNames = new Set(
        appliedMigrations.map((m) => {
          if (Array.isArray(m)) {
            return m[0] as string;
          }
          return m.name;
        })
      );

      // Apply new migrations
      for (const migration of migrations) {
        if (appliedNames.has(migration.name)) {
          console.log(
            `[SDK] ↷ Migration ${migration.name} already applied, skipping`
          );
          continue;
        }

        console.log(`[SDK] → Applying migration: ${migration.name}`);

        // Split SQL by statement separator and execute each statement
        const statements = migration.sql
          .split("--> statement-breakpoint")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        for (const statement of statements) {
          try {
            await this.execute(statement);
          } catch (error: unknown) {
            // Ignore "table already exists" errors for backwards compatibility
            // This handles the case where tables were created manually before migrations
            if (
              error instanceof Error &&
              !error.message?.includes("already exists")
            ) {
              throw error;
            }
            console.log(
              `[SDK] ⚠ Ignoring "already exists" error for backwards compatibility`
            );
          }
        }

        // Record migration as applied
        await this.execute(
          `INSERT INTO "${migrationsTableName}" (name, applied_at) VALUES (?, ?)`,
          [migration.name, Date.now()]
        );

        console.log(`[SDK] ✓ Migration ${migration.name} applied successfully`);
      }

      console.log(`[SDK] All migrations completed successfully`);
    } catch (error) {
      console.error(`[SDK] Error running migrations:`, error);
      throw error;
    }
  }
}
