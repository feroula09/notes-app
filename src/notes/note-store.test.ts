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

  it('重新開啟筆記庫後，筆記和附圖都還在', async () => {
    const { store, db, clock, files } = await createTestNoteStore();
    const note = await store.createNote();
    await store.updateBody(note.id, '不會不見');
    const { images } = await store.addImages(note.id, ['content://camera/1.jpg']);

    const reopened = await openNoteStore({ db, clock, newId: randomUUID, files });

    expect(await reopened.getNote(note.id)).toMatchObject({ body: '不會不見', images });
  });

  describe('搜尋', () => {
    it('同時比對標題和內文：只記得內容裡的一個詞也找得到', async () => {
      const { store } = await createTestNoteStore('購物清單\n牛奶、雞蛋', '牛奶糖食譜', '週末爬山');

      const titles = (await store.listNotes('牛奶')).map((n) => n.title);

      expect(titles.sort()).toEqual(['牛奶糖食譜', '購物清單']);
    });

    it('不分大小寫', async () => {
      const { store } = await createTestNoteStore('買 iPhone 充電線', '讀 IPHONE 說明書', 'Android 設定');

      const titles = (await store.listNotes('iphone')).map((n) => n.title);

      expect(titles.sort()).toEqual(['讀 IPHONE 說明書', '買 iPhone 充電線']);
    });

    it.each([
      ['全形英文', '買ＵＳＢ線', 'ｕｓｂ'],
      ['帶重音的字母', 'CAFÉ 菜單', 'café'],
    ])('不分大小寫也適用於%s', async (_, body, query) => {
      const { store } = await createTestNoteStore(body);

      expect((await store.listNotes(query)).map((n) => n.title)).toEqual([body]);
    });

    it('不搜尋回收桶裡的筆記', async () => {
      const { store, db, notes } = await createTestNoteStore('留著的牛奶', '刪掉的牛奶');
      // 還沒有移到回收桶的操作（#6），直接標記 deleted_at 模擬。
      await db.run('UPDATE notes SET deleted_at = ? WHERE id = ?', [Date.now(), notes[1].id]);

      const titles = (await store.listNotes('牛奶')).map((n) => n.title);

      expect(titles).toEqual(['留著的牛奶']);
    });

    it('清掉搜尋字串（或只剩空白）就列出全部筆記', async () => {
      const { store } = await createTestNoteStore('一', '二');

      expect(await store.listNotes('')).toHaveLength(2);
      expect(await store.listNotes('  ')).toHaveLength(2);
    });
  });

  describe('置頂', () => {
    it('置頂的筆記排在最上方，其餘照最後修改時間由新到舊', async () => {
      const { store, notes } = await createTestNoteStore('最舊', '中間', '最新');
      const ids = Object.fromEntries(notes.map((note) => [note.body, note.id]));

      await store.setPinned([ids['最舊']], true);

      expect((await store.listNotes()).map((n) => [n.title, n.pinned])).toEqual([
        ['最舊', true],
        ['最新', false],
        ['中間', false],
      ]);
    });

    it('一次置頂多則：置頂的筆記之間也照最後修改時間由新到舊', async () => {
      const { store, notes } = await createTestNoteStore('一', '二', '三', '四');
      const ids = Object.fromEntries(notes.map((note) => [note.body, note.id]));

      await store.setPinned([ids['一'], ids['三']], true);

      expect((await store.listNotes()).map((n) => n.title)).toEqual(['三', '一', '四', '二']);
    });

    it('置頂和取消置頂都不改變最後修改時間', async () => {
      const { store, clock, notes } = await createTestNoteStore('不要動我的時間');
      const updatedAt = notes[0].updatedAt;
      clock.advance(60_000);

      await store.setPinned([notes[0].id], true);
      expect(await store.getNote(notes[0].id)).toMatchObject({ pinned: true, updatedAt });

      clock.advance(60_000);
      await store.setPinned([notes[0].id], false);
      expect(await store.getNote(notes[0].id)).toMatchObject({ pinned: false, updatedAt });
    });

    it('取消置頂（可以一次多則）後，回到依最後修改時間排序', async () => {
      const { store, notes } = await createTestNoteStore('舊', '中', '新');
      const ids = Object.fromEntries(notes.map((note) => [note.body, note.id]));
      await store.setPinned([ids['舊'], ids['中']], true);

      await store.setPinned([ids['舊'], ids['中']], false);

      expect((await store.listNotes()).map((n) => [n.title, n.pinned])).toEqual([
        ['新', false],
        ['中', false],
        ['舊', false],
      ]);
    });
  });

  describe('回收桶', () => {
    it('移到回收桶（可以一次多則）後，筆記從列表和搜尋結果中消失', async () => {
      const { store, notes } = await createTestNoteStore('買牛奶', '牛奶糖食譜', '週末爬山');

      await store.moveToTrash([notes[0].id, notes[1].id]);

      expect((await store.listNotes()).map((n) => n.title)).toEqual(['週末爬山']);
      expect(await store.listNotes('牛奶')).toEqual([]);
    });

    it('復原剛剛的刪除：筆記回到原本的位置，最後修改時間不變', async () => {
      const { store, clock, notes } = await createTestNoteStore('最舊', '中間', '最新');
      await store.moveToTrash([notes[1].id]);
      clock.advance(60_000);

      await store.undoMoveToTrash([notes[1].id]);

      expect((await store.listNotes()).map((n) => n.title)).toEqual(['最新', '中間', '最舊']);
      expect(await store.getNote(notes[1].id)).toMatchObject({
        deletedAt: null,
        updatedAt: notes[1].updatedAt,
      });
    });

    it('從回收桶還原：修改時間設為現在，排到最上面', async () => {
      const { store, clock, notes } = await createTestNoteStore('最舊', '最新');
      await store.moveToTrash([notes[0].id]);
      clock.advance(60_000);

      await store.restoreFromTrash([notes[0].id]);

      expect((await store.listNotes()).map((n) => n.title)).toEqual(['最舊', '最新']);
      expect(await store.getNote(notes[0].id)).toMatchObject({
        deletedAt: null,
        updatedAt: clock.now(),
      });
    });

    it('從回收桶還原時保留置頂狀態', async () => {
      const { store, notes } = await createTestNoteStore('置頂的', '沒置頂的');
      await store.setPinned([notes[0].id], true);
      await store.moveToTrash([notes[0].id]);

      await store.restoreFromTrash([notes[0].id]);

      expect(await store.getNote(notes[0].id)).toMatchObject({ pinned: true });
    });

    it('列出回收桶：只有回收桶裡的筆記，最近移入的在前', async () => {
      const { store, clock, notes } = await createTestNoteStore('先刪的\n內文', '後刪的', '沒刪的');
      await store.moveToTrash([notes[0].id]);
      clock.advance(60_000);
      await store.moveToTrash([notes[1].id]);

      expect(await store.listTrash()).toEqual([
        expect.objectContaining({ id: notes[1].id, title: '後刪的' }),
        expect.objectContaining({ id: notes[0].id, title: '先刪的', preview: '內文' }),
      ]);
    });

    const DAY = 24 * 60 * 60 * 1000;
    it.each([
      ['剛移入', 0, 30],
      ['過了一小時', 60 * 60 * 1000, 30],
      ['過了一天', DAY, 29],
      ['過了 29 天又一小時', 29 * DAY + 60 * 60 * 1000, 1],
      ['超過 30 天但還沒永久刪除', 31 * DAY, 1],
    ])('剩餘天數：%s → %i 天後永久刪除', async (_, elapsed, daysLeft) => {
      const { store, clock, notes } = await createTestNoteStore('要刪的');
      await store.moveToTrash([notes[0].id]);

      clock.advance(elapsed);

      expect(await store.listTrash()).toEqual([expect.objectContaining({ daysLeft })]);
    });
  });

  describe('附圖', () => {
    it('加入附圖：各存一份檔案，取得筆記時依加入順序附帶附圖', async () => {
      const { store, files, notes } = await createTestNoteStore('停車位');

      await store.addImages(notes[0].id, ['content://camera/1.jpg']);
      await store.addImages(notes[0].id, ['content://album/2.jpg', 'content://album/3.jpg']);

      const images = (await store.getNote(notes[0].id))!.images;
      expect(images.map((image) => files.sourceOf(image.uri))).toEqual([
        'content://camera/1.jpg',
        'content://album/2.jpg',
        'content://album/3.jpg',
      ]);
    });

    it('移除附圖：只拿掉那一張，檔案也一起刪除', async () => {
      const { store, files, notes } = await createTestNoteStore('拍錯了');
      const [wrong, kept] = (
        await store.addImages(notes[0].id, ['content://album/wrong.jpg', 'content://album/kept.jpg'])
      ).images;

      await store.removeImage(notes[0].id, wrong.id);

      expect((await store.getNote(notes[0].id))!.images).toEqual([kept]);
      expect(files.sourceOf(wrong.uri)).toBeUndefined();
      expect(files.sourceOf(kept.uri)).toBe('content://album/kept.jpg');
    });

    it('列表上有附圖的筆記帶著第一張的縮圖；沒有附圖的沒有縮圖', async () => {
      const { store, notes } = await createTestNoteStore('沒有圖', '購物\n有圖');
      const [first] = (
        await store.addImages(notes[1].id, ['content://album/1.jpg', 'content://album/2.jpg'])
      ).images;

      expect(await store.listNotes()).toEqual([
        expect.objectContaining({ title: '購物', preview: '有圖', thumbnailUri: first.uri }),
        expect.objectContaining({ title: '沒有圖', thumbnailUri: null }),
      ]);
    });

    it.each([
      ['完全沒有文字', ''],
      ['只有空白和換行', ' \n \n'],
    ])('只有附圖的筆記（%s）標題顯示「（圖片）」', async (_, body) => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      await store.updateBody(note.id, body);
      await store.addImages(note.id, ['content://camera/1.jpg']);

      expect(await store.listNotes()).toEqual([
        expect.objectContaining({ title: '（圖片）', preview: '' }),
      ]);
    });

    it('有文字的筆記照樣用第一行當標題，即使有附圖', async () => {
      const { store, notes } = await createTestNoteStore('\n第二行才有字');
      await store.addImages(notes[0].id, ['content://camera/1.jpg']);

      expect(await store.listNotes()).toEqual([
        expect.objectContaining({ title: '', preview: '第二行才有字' }),
      ]);
    });

    it('加入或移除附圖都會把最後修改時間設為現在', async () => {
      const { store, clock, notes } = await createTestNoteStore('收據');

      clock.advance(60_000);
      const [image] = (await store.addImages(notes[0].id, ['content://camera/1.jpg'])).images;
      expect(await store.getNote(notes[0].id)).toMatchObject({ updatedAt: clock.now() });

      clock.advance(60_000);
      await store.removeImage(notes[0].id, image.id);
      expect(await store.getNote(notes[0].id)).toMatchObject({ updatedAt: clock.now() });
    });
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

    it('只有附圖、沒有文字的筆記不算空白，照樣保留', async () => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      await store.addImages(note.id, ['content://camera/whiteboard.jpg']);

      await store.discardIfEmpty(note.id);

      expect((await store.listNotes()).map((n) => n.id)).toEqual([note.id]);
    });

    it('附圖全部移除、也沒有文字，就變回空白筆記', async () => {
      const { store } = await createTestNoteStore();
      const note = await store.createNote();
      const [image] = (await store.addImages(note.id, ['content://camera/1.jpg'])).images;
      await store.removeImage(note.id, image.id);

      await store.discardIfEmpty(note.id);

      expect(await store.getNote(note.id)).toBeNull();
    });
  });
});
