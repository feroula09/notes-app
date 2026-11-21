import type { Clock } from './clock';
import type { Database } from './database';

export type Note = {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  /** 有值代表在回收桶（ADR 0001：刪除只標記）。 */
  deletedAt: number | null;
};

export type NoteListItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
};

/** 唯一的資料介面：畫面只透過它讀寫筆記。 */
export interface NoteStore {
  createNote(): Promise<Note>;
  updateBody(id: string, body: string): Promise<Note>;
  getNote(id: string): Promise<Note | null>;
  /**
   * 不含回收桶，依最後修改時間由新到舊。
   * 有 query 時只列出內文（含標題）包含它的筆記，不分大小寫；空白字串視同沒有 query。
   */
  listNotes(query?: string): Promise<NoteListItem[]>;
  /** 離開編輯畫面時呼叫：空白筆記直接刪除（不進回收桶）。 */
  discardIfEmpty(id: string): Promise<void>;
  /** 筆記有任何變動時呼叫 listener；回傳取消訂閱的函式。 */
  subscribe(listener: () => void): () => void;
}

type Deps = { db: Database; clock: Clock; newId: () => string };

type NoteRow = {
  id: string;
  body: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

// 第 N 個元素把資料庫從版本 N 升到 N+1。只能往後加，不可修改已發布的 migration。
const migrations: string[] = [
  `CREATE TABLE notes (
    id TEXT PRIMARY KEY NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
  );`,
];

async function migrate(db: Database) {
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  for (let version = row?.user_version ?? 0; version < migrations.length; version++) {
    await db.exec(
      `BEGIN; ${migrations[version]} PRAGMA user_version = ${version + 1}; COMMIT;`,
    );
  }
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/** 標題是內文第一行；預覽是標題之後的內文。 */
function splitTitle(body: string): { title: string; preview: string } {
  const newline = body.indexOf('\n');
  if (newline === -1) return { title: body.trim(), preview: '' };
  return { title: body.slice(0, newline).trim(), preview: body.slice(newline + 1).trim() };
}

export async function openNoteStore({ db, clock, newId }: Deps): Promise<NoteStore> {
  await migrate(db);

  async function getNote(id: string) {
    const row = await db.get<NoteRow>('SELECT * FROM notes WHERE id = ?', [id]);
    return row ? toNote(row) : null;
  }

  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  return {
    getNote,

    async createNote() {
      const id = newId();
      const now = clock.now();
      await db.run('INSERT INTO notes (id, body, created_at, updated_at) VALUES (?, ?, ?, ?)', [
        id,
        '',
        now,
        now,
      ]);
      notify();
      return (await getNote(id))!;
    },

    async updateBody(id, body) {
      await db.run('UPDATE notes SET body = ?, updated_at = ? WHERE id = ?', [
        body,
        clock.now(),
        id,
      ]);
      notify();
      return (await getNote(id))!;
    },

    async listNotes(query = '') {
      const rows = await db.all<NoteRow>(
        'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY updated_at DESC',
      );
      // 在 JS 比對而不是 SQL：SQLite 的 lower() 只轉換 ASCII，toLowerCase() 涵蓋全形、重音等字母。
      const needle = query.trim().toLowerCase();
      return rows
        .filter((row) => row.body.toLowerCase().includes(needle))
        .map((row) => ({ id: row.id, updatedAt: row.updated_at, ...splitTitle(row.body) }));
    },

    async discardIfEmpty(id) {
      const note = await getNote(id);
      if (note && note.body.trim() === '') {
        await db.run('DELETE FROM notes WHERE id = ?', [id]);
        notify();
      }
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
