// 測試專用：better-sqlite3 是 Node 原生模組，只能在 Jest 裡載入，APP 程式碼不可以 import 這個檔案。
import BetterSqlite3 from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

import type { Clock } from './clock';
import type { Database, SqlValue } from './database';
import { openNoteStore } from './note-store';

export function createBetterSqliteDatabase(): Database {
  const db = new BetterSqlite3(':memory:');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...params);
    },
    async get<T>(sql: string, params: SqlValue[] = []) {
      return (db.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      return db.prepare(sql).all(...params) as T[];
    },
  };
}

export type TestClock = Clock & { set(ms: number): void; advance(ms: number): void };

export function createTestClock(start = Date.UTC(2026, 0, 1, 9, 0)): TestClock {
  let current = start;
  return {
    now: () => current,
    set: (ms) => {
      current = ms;
    },
    advance: (ms) => {
      current += ms;
    },
  };
}

/** bodies：先建立好的筆記內文，notes 依同樣順序回傳。 */
export async function createTestNoteStore(...bodies: string[]) {
  const db = createBetterSqliteDatabase();
  const clock = createTestClock();
  const store = await openNoteStore({ db, clock, newId: randomUUID });
  const notes = [];
  for (const body of bodies) {
    const note = await store.createNote();
    notes.push(await store.updateBody(note.id, body));
  }
  return { store, db, clock, notes };
}
