import { fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';

import { RootStack } from '@/components/root-stack';
import { NoteStoreProvider } from '@/notes/note-store-context';
import { createTestNoteStore } from '@/notes/testing';
import { NoteEditor } from '@/screens/note-editor';
import { NoteList } from '@/screens/note-list';
import { pressComposeButton, typeInComposeSearchBar } from '@/test-utils/compose';

/** bodies：開啟 APP 前已經存在的筆記內文。 */
async function renderApp(...bodies: string[]) {
  const { store } = await createTestNoteStore();
  for (const body of bodies) {
    const note = await store.createNote();
    await store.updateBody(note.id, body);
  }
  await renderRouter({
    _layout: () => (
      <NoteStoreProvider store={store}>
        <RootStack />
      </NoteStoreProvider>
    ),
    index: NoteList,
    'notes/[id]': NoteEditor,
  });
  return { store };
}

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
