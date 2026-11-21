import { act, fireEvent, screen, testRouter, waitFor } from 'expo-router/testing-library';

import type { NoteStore } from '@/notes/note-store';
import { createTestNoteStore } from '@/notes/testing';
import {
  isComposeToggleChecked,
  pressComposeButton,
  toggleComposeButton,
  typeInComposeSearchBar,
} from '@/test-utils/compose';
import { renderApp, renderAppWithStore } from '@/test-utils/render-app';

describe('筆記列表', () => {
  it('第一次使用、沒有筆記時，告訴使用者按「＋」開始寫', async () => {
    await renderApp();

    expect(await screen.findByText(/按右下角的「＋」開始寫/)).toBeOnTheScreen();
  });

  it('按「＋」寫一則筆記，返回後在列表上看得到它', async () => {
    await renderApp();

    await pressComposeButton('新增筆記');
    await fireEvent.changeText(await screen.findByLabelText('筆記內文'), '買牛奶\n還有雞蛋');
    await testRouter.back('/');

    expect(await screen.findByText('買牛奶')).toBeOnTheScreen();
    expect(screen.getByText('還有雞蛋')).toBeOnTheScreen();
    expect(screen.queryByText(/按右下角的「＋」開始寫/)).not.toBeOnTheScreen();
  });

  it('按上方列的返回回到列表，編輯時看得到「已儲存」', async () => {
    await renderApp();

    await pressComposeButton('新增筆記');
    await fireEvent.changeText(await screen.findByLabelText('筆記內文'), '買牛奶');
    expect(await screen.findByText(/^已儲存・\d\d:\d\d$/)).toBeOnTheScreen();
    await pressComposeButton('返回');

    expect(await screen.findByText('買牛奶')).toBeOnTheScreen();
  });

  it('按「＋」卻什麼都沒寫就返回，列表不會多出空白筆記', async () => {
    const { store } = await renderApp();

    await pressComposeButton('新增筆記');
    await screen.findByLabelText('筆記內文');
    await testRouter.back('/');

    expect(await screen.findByText(/按右下角的「＋」開始寫/)).toBeOnTheScreen();
    expect(await store.listNotes()).toEqual([]);
  });

  describe('置頂', () => {
    it('在編輯頁置頂後回到列表，筆記出現在「已置頂」區', async () => {
      await renderApp('買牛奶', '週末爬山');
      await screen.findByText('買牛奶');
      // 沒有置頂筆記時不顯示區塊標題。
      expect(screen.queryByText('已置頂')).not.toBeOnTheScreen();
      expect(screen.queryByText('其他')).not.toBeOnTheScreen();

      await fireEvent.press(screen.getByText('買牛奶'));
      await toggleComposeButton('置頂');
      await testRouter.back('/');

      await screen.findByText('已置頂');
      const order = screen
        .getAllByText(/^(已置頂|其他|買牛奶|週末爬山)$/)
        .map((node) => node.props.children);
      expect(order).toEqual(['已置頂', '買牛奶', '其他', '週末爬山']);
    });

    it('打開已置頂的筆記時，置頂鍵顯示為開啟', async () => {
      const { store } = await renderApp('買牛奶');
      await store.setPinned([(await store.listNotes())[0].id], true);

      await fireEvent.press(await screen.findByText('買牛奶'));

      expect(await isComposeToggleChecked('置頂')).toBe(true);
    });
  });

  describe('搜尋', () => {
    it('邊打字邊篩選：列表只剩標題或內文含有搜尋字串的筆記', async () => {
      await renderApp('購物清單\n牛奶、雞蛋', '週末爬山', '牛奶糖食譜');
      await screen.findByText('購物清單');

      await typeInComposeSearchBar('搜尋筆記', '牛奶');

      await waitFor(() => expect(screen.queryByText('週末爬山')).not.toBeOnTheScreen());
      expect(screen.getByText('購物清單')).toBeOnTheScreen();
      expect(screen.getByText('牛奶糖食譜')).toBeOnTheScreen();
    });

    it('清除搜尋字串後恢復完整列表', async () => {
      await renderApp('購物清單', '週末爬山');
      await screen.findByText('購物清單');

      await typeInComposeSearchBar('搜尋筆記', '購物');
      await waitFor(() => expect(screen.queryByText('週末爬山')).not.toBeOnTheScreen());
      await typeInComposeSearchBar('搜尋筆記', '');

      expect(await screen.findByText('週末爬山')).toBeOnTheScreen();
      expect(screen.getByText('購物清單')).toBeOnTheScreen();
    });

    it('打字很快時，比較晚回來的舊搜尋結果不會蓋掉新的', async () => {
      const { store } = await createTestNoteStore('牛奶', '牛排');
      // 「牛」的查詢故意晚一點才回來，比「牛排」還晚。
      let releaseSlowQuery = () => {};
      const slowStore: NoteStore = {
        ...store,
        async listNotes(query) {
          const notes = await store.listNotes(query);
          if (query === '牛') await new Promise<void>((resolve) => (releaseSlowQuery = resolve));
          return notes;
        },
      };
      await renderAppWithStore(slowStore);
      await screen.findByText('牛奶');

      await typeInComposeSearchBar('搜尋筆記', '牛');
      await typeInComposeSearchBar('搜尋筆記', '牛排');
      await waitFor(() => expect(screen.queryByText('牛奶')).not.toBeOnTheScreen());
      await act(async () => releaseSlowQuery());

      expect(screen.queryByText('牛奶')).not.toBeOnTheScreen();
      expect(screen.getByText('牛排')).toBeOnTheScreen();
    });

    it('沒有結果時說明找不到含有搜尋字串的筆記', async () => {
      await renderApp('購物清單');
      await screen.findByText('購物清單');

      await typeInComposeSearchBar('搜尋筆記', '颱風');

      expect(await screen.findByText('找不到含有『颱風』的筆記')).toBeOnTheScreen();
      expect(screen.queryByText('購物清單')).not.toBeOnTheScreen();
      expect(screen.queryByText(/按右下角的「＋」開始寫/)).not.toBeOnTheScreen();
    });
  });
});
