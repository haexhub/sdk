import type { HaexHubClient } from "../client";
import type { DatabaseQueryResult, DatabaseTableInfo } from "../types";

export class DatabaseAPI {
  constructor(private client: HaexHubClient) {}

  async query<T>(query: string, params?: unknown[]): Promise<T[]> {
    const result = await this.client.request<DatabaseQueryResult>(
      "haextension.db.query",
      {
        query,
        params,
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
    return this.client.request<DatabaseQueryResult>("haextension.db.execute", {
      query,
      params,
    });
  }

  async transaction(statements: string[]): Promise<void> {
    await this.client.request("haextension.db.transaction", {
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
}
