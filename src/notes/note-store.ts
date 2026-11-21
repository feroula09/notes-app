import type { Clock } from './clock';
import type { Database } from './database';

export type Note = {
  id: string;
  body: string;
  createdAt: number;
  updatedAt: number;
  /** 有值代表在回收桶（ADR 0001：刪除只標記）。 */
  deletedAt: number | null;
  pinned: boolean;
};

export type NoteListItem = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  pinned: boolean;
};

export type TrashListItem = NoteListItem & {
  /** 再過幾天會永久刪除，最少 1（還沒清除前都是「即將」刪除）。 */
  daysLeft: number;
};

/** 回收桶裡的筆記保留幾天。 */
export const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 唯一的資料介面：畫面只透過它讀寫筆記。 */
export interface NoteStore {
  createNote(): Promise<Note>;
  updateBody(id: string, body: string): Promise<Note>;
  getNote(id: string): Promise<Note | null>;
  /**
   * 不含回收桶。置頂的筆記在前，置頂和其他各自依最後修改時間由新到舊。
   * 有 query 時只列出內文（含標題）包含它的筆記，不分大小寫；空白字串視同沒有 query。
   */
  listNotes(query?: string): Promise<NoteListItem[]>;
  /** 置頂或取消置頂，可以一次多則；不改變最後修改時間。 */
  setPinned(ids: string[], pinned: boolean): Promise<void>;
  /** 移到回收桶，可以一次多則；不改變最後修改時間。 */
  moveToTrash(ids: string[]): Promise<void>;
  /** 復原剛剛移到回收桶的筆記：只清除 deletedAt，所以回到原本的位置。 */
  undoMoveToTrash(ids: string[]): Promise<void>;
  /** 從回收桶還原：清除 deletedAt 並把修改時間設為現在，所以排到最上面；置頂狀態保留。 */
  restoreFromTrash(ids: string[]): Promise<void>;
  /** 回收桶裡的筆記，最近移入的在前。 */
  listTrash(): Promise<TrashListItem[]>;
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
  pinned: 0 | 1;
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
  `ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;`,
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
    pinned: row.pinned === 1,
  };
}

/** `id IN (?, ?, …)` 的佔位符，數量和 ids 一樣。 */
function placeholders(ids: string[]) {
  return ids.map(() => '?').join(', ');
}

/** 標題是內文第一行；預覽是標題之後的內文。 */
function splitTitle(body: string): { title: string; preview: string } {
  const newline = body.indexOf('\n');
  if (newline === -1) return { title: body.trim(), preview: '' };
  return { title: body.slice(0, newline).trim(), preview: body.slice(newline + 1).trim() };
}

function toListItem(row: NoteRow): NoteListItem {
  return {
    id: row.id,
    updatedAt: row.updated_at,
    pinned: row.pinned === 1,
    ...splitTitle(row.body),
  };
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
        'SELECT * FROM notes WHERE deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC',
      );
      // 在 JS 比對而不是 SQL：SQLite 的 lower() 只轉換 ASCII，toLowerCase() 涵蓋全形、重音等字母。
      const needle = query.trim().toLowerCase();
      return rows
        .filter((row) => row.body.toLowerCase().includes(needle))
        .map(toListItem);
    },

    async setPinned(ids, pinned) {
      await db.run(`UPDATE notes SET pinned = ? WHERE id IN (${placeholders(ids)})`, [
        pinned ? 1 : 0,
        ...ids,
      ]);
      notify();
    },

    async moveToTrash(ids) {
      await db.run(`UPDATE notes SET deleted_at = ? WHERE id IN (${placeholders(ids)})`, [
        clock.now(),
        ...ids,
      ]);
      notify();
    },

    async undoMoveToTrash(ids) {
      await db.run(`UPDATE notes SET deleted_at = NULL WHERE id IN (${placeholders(ids)})`, ids);
      notify();
    },

    async restoreFromTrash(ids) {
      await db.run(
        `UPDATE notes SET deleted_at = NULL, updated_at = ? WHERE id IN (${placeholders(ids)})`,
        [clock.now(), ...ids],
      );
      notify();
    },

    async listTrash() {
      const rows = await db.all<NoteRow & { deleted_at: number }>(
        'SELECT * FROM notes WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
      );
      const now = clock.now();
      return rows.map((row) => {
        const purgeAt = row.deleted_at + TRASH_RETENTION_DAYS * DAY_MS;
        return { ...toListItem(row), daysLeft: Math.max(1, Math.ceil((purgeAt - now) / DAY_MS)) };
      });
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
