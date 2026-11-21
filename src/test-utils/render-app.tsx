import { renderRouter } from 'expo-router/testing-library';

import { RootStack } from '@/components/root-stack';
import { SnackbarContext } from '@/components/snackbar';
import { ImagePickerContext } from '@/image-picker/image-picker';
import type { NoteStore } from '@/notes/note-store';
import { NoteStoreProvider } from '@/notes/note-store-context';
import { createTestNoteStore } from '@/notes/testing';
import { NoteEditor } from '@/screens/note-editor';
import { NoteList } from '@/screens/note-list';
import { TrashList } from '@/screens/trash-list';
import { TrashNote } from '@/screens/trash-note';
import { createFakeImagePicker } from '@/test-utils/image-picker';
import { createFakeSnackbar } from '@/test-utils/snackbar';

/** 渲染整個 APP（和 src/app 相同的路由），bodies 是開啟前已經存在的筆記內文。 */
export async function renderApp(...bodies: string[]) {
  const { store, clock, files } = await createTestNoteStore(...bodies);
  const { snackbar, imagePicker } = await renderAppWithStore(store);
  return { store, clock, files, snackbar, imagePicker };
}

export async function renderAppWithStore(store: NoteStore) {
  const snackbar = createFakeSnackbar();
  const imagePicker = createFakeImagePicker();
  await renderRouter({
    _layout: () => (
      <NoteStoreProvider store={store}>
        <SnackbarContext.Provider value={snackbar.show}>
          <ImagePickerContext.Provider value={imagePicker.picker}>
            <RootStack />
          </ImagePickerContext.Provider>
        </SnackbarContext.Provider>
      </NoteStoreProvider>
    ),
    index: NoteList,
    'notes/[id]': NoteEditor,
    'trash/index': TrashList,
    'trash/[id]': TrashNote,
  });
  return { snackbar, imagePicker };
}
