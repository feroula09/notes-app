import * as SQLite from 'expo-sqlite';

import type { Database } from './database';

export async function openExpoSqliteDatabase(name: string): Promise<Database> {
  const db = await SQLite.openDatabaseAsync(name);
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params = []) => {
      await db.runAsync(sql, params);
    },
    get: (sql, params = []) => db.getFirstAsync(sql, params),
    all: (sql, params = []) => db.getAllAsync(sql, params),
  };
}
