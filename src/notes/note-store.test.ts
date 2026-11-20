import { randomUUID } from 'node:crypto';

import { openNoteStore } from './note-store';
import { createTestNoteStore } from './testing';

describe('筆記庫', () => {
  it('新增筆記並寫入內文後，列表上看得到它', async () => {
    const { store } = await createTestNoteStore();

    const note = await store.createNote();
    await store.updateBody(note.id, '買牛奶\n還有雞蛋');

    const list = await store.listNotes();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: note.id, title: '買牛奶', preview: '還有雞蛋' });
  });

  it('更新內文會把最後修改時間設為現在', async () => {
    const { store, clock } = await createTestNoteStore();
    clock.set(Date.UTC(2026, 0, 1, 9, 0));
    const note = await store.createNote();

    clock.set(Date.UTC(2026, 0, 1, 9, 30));
    await store.updateBody(note.id, '改過了');

    expect(await store.getNote(note.id)).toMatchObject({
      body: '改過了',
      createdAt: Date.UTC(2026, 0, 1, 9, 0),
      updatedAt: Date.UTC(2026, 0, 1, 9, 30),
    });
  });

  it('列表依最後修改時間由新到舊排序', async () => {
    const { store, clock } = await createTestNoteStore();
    const older = await store.createNote();
    await store.updateBody(older.id, '先寫的');
    clock.advance(60_000);
    const newer = await store.createNote();
    await store.updateBody(newer.id, '後寫的');

    expect((await store.listNotes()).map((n) => n.title)).toEqual(['後寫的', '先寫的']);

    clock.advance(60_000);
    await store.updateBody(older.id, '先寫的，剛剛又改');

    expect((await store.listNotes()).map((n) => n.title)).toEqual(['先寫的，剛剛又改', '後寫的']);
  });

  describe('標題推導', () => {
    it.each([
      ['只有一行：整行是標題，沒有預覽', '週末去爬山', '週末去爬山', ''],
      ['標題前後的空白去掉', '  待辦  \n繳電費', '待辦', '繳電費'],
      ['預覽是第一行以後的全部內文', '清單\n蘋果\n香蕉\n\n芭樂', '清單', '蘋果\n香蕉\n\n芭樂'],
      ['第一行是空的：標題就是空的', '\n第二行', '', '第二行'],
    ])('%s', async (_, body, title, preview) => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      await store.updateBody(note.id, body);

      expect(await store.listNotes()).toEqual([expect.objectContaining({ title, preview })]);
    });
  });

  it('重新開啟筆記庫後，筆記還在', async () => {
    const { store, db, clock } = await createTestNoteStore();
    const note = await store.createNote();
    await store.updateBody(note.id, '不會不見');

    const reopened = await openNoteStore({ db, clock, newId: randomUUID });

    expect(await reopened.getNote(note.id)).toMatchObject({ body: '不會不見' });
  });

  describe('離開編輯時捨棄空白筆記', () => {
    it.each([
      ['什麼都沒寫', ''],
      ['只有空白和換行', '  \n\t \n '],
    ])('%s：筆記被刪除，不留在列表', async (_, body) => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      await store.updateBody(note.id, body);

      await store.discardIfEmpty(note.id);

      expect(await store.listNotes()).toEqual([]);
      expect(await store.getNote(note.id)).toBeNull();
    });

    it('有文字的筆記照樣保留', async () => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      await store.updateBody(note.id, '  有字  ');

      await store.discardIfEmpty(note.id);

      expect((await store.listNotes()).map((n) => n.id)).toEqual([note.id]);
    });
  });
});
