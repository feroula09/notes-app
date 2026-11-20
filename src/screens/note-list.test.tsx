import { fireEvent, renderRouter, screen, testRouter } from 'expo-router/testing-library';

import { RootStack } from '@/components/root-stack';
import { NoteStoreProvider } from '@/notes/note-store-context';
import { createTestNoteStore } from '@/notes/testing';
import { NoteEditor } from '@/screens/note-editor';
import { NoteList } from '@/screens/note-list';
import { pressComposeButton } from '@/test-utils/compose';

async function renderApp() {
  const { store } = await createTestNoteStore();
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

  it('按「＋」卻什麼都沒寫就返回，列表不會多出空白筆記', async () => {
    const { store } = await renderApp();

    await pressComposeButton('新增筆記');
    await screen.findByLabelText('筆記內文');
    await testRouter.back('/');

    expect(await screen.findByText(/按右下角的「＋」開始寫/)).toBeOnTheScreen();
    expect(await store.listNotes()).toEqual([]);
  });
});
