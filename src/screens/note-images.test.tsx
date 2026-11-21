import { act, fireEvent, screen, testRouter, waitFor } from 'expo-router/testing-library';
import { Linking } from 'react-native';

import type { NoteStore } from '@/notes/note-store';
import { createTestNoteStore, type MemoryImageFiles } from '@/notes/testing';
import {
  findComposeText,
  pressComposeButton,
  pressComposeButtonWithoutWaiting,
  queryComposeText,
} from '@/test-utils/compose';
import { imageSources } from '@/test-utils/images';
import { renderApp, renderAppWithStore } from '@/test-utils/render-app';

/** 編輯頁附件區的縮圖，由左到右各是從哪個來源加入的。 */
const attachmentSources = (files: MemoryImageFiles) => imageSources(files, /^第 \d+ 張附圖$/);

describe('附圖', () => {
  it('在編輯頁拍照：附圖出現在文字下方的附件區', async () => {
    const { files, imagePicker } = await renderApp('停車位');
    await fireEvent.press(await screen.findByText('停車位'));
    await screen.findByLabelText('筆記內文');

    imagePicker.next.camera = { status: 'picked', uris: ['content://camera/B2-35.jpg'] };
    await pressComposeButton('拍照');

    await waitFor(() => expect(attachmentSources(files)).toEqual(['content://camera/B2-35.jpg']));
  });

  it('從相簿一次選多張：依選取順序接在原本的附圖後面', async () => {
    const { files, imagePicker } = await renderApp('旅行');
    await fireEvent.press(await screen.findByText('旅行'));
    imagePicker.next.camera = { status: 'picked', uris: ['content://camera/1.jpg'] };
    await pressComposeButton('拍照');

    imagePicker.next.library = {
      status: 'picked',
      uris: ['content://album/2.jpg', 'content://album/3.jpg'],
    };
    await pressComposeButton('從相簿選圖');

    await waitFor(() =>
      expect(attachmentSources(files)).toEqual([
        'content://camera/1.jpg',
        'content://album/2.jpg',
        'content://album/3.jpg',
      ]),
    );
  });

  it('移除單張附圖：只拿掉那一張', async () => {
    const { files, imagePicker } = await renderApp('收據');
    await fireEvent.press(await screen.findByText('收據'));
    imagePicker.next.library = {
      status: 'picked',
      uris: ['content://album/ok.jpg', 'content://album/wrong.jpg'],
    };
    await pressComposeButton('從相簿選圖');
    await waitFor(() => expect(attachmentSources(files)).toHaveLength(2));

    await pressComposeButton('移除第 2 張附圖');

    await waitFor(() => expect(attachmentSources(files)).toEqual(['content://album/ok.jpg']));
  });

  it('取消拍照：什麼都不加', async () => {
    const { files, store, imagePicker } = await renderApp('停車位');
    await fireEvent.press(await screen.findByText('停車位'));
    imagePicker.next.camera = { status: 'canceled' };

    await pressComposeButton('拍照');

    expect(attachmentSources(files)).toEqual([]);
    expect((await store.listNotes())[0].thumbnailUri).toBeNull();
  });

  it('只拍照、不寫字就返回：筆記保留，列表標題顯示「（圖片）」，右邊是第一張的縮圖', async () => {
    const { files, imagePicker } = await renderApp();
    await pressComposeButton('新增筆記');
    await screen.findByLabelText('筆記內文');
    imagePicker.next.camera = {
      status: 'picked',
      uris: ['content://camera/whiteboard.jpg', 'content://camera/second.jpg'],
    };
    await pressComposeButton('拍照');
    await waitFor(() => expect(attachmentSources(files)).toHaveLength(2));

    await testRouter.back('/');

    expect(await screen.findByText('（圖片）')).toBeOnTheScreen();
    expect(imageSources(files, /^縮圖$/)).toEqual(['content://camera/whiteboard.jpg']);
  });

  it('拍完照、附圖還沒存好就返回：等附圖存好，筆記不會被當成空白筆記刪掉', async () => {
    const { store } = await createTestNoteStore();
    // 壓縮和存檔故意晚一點才完成。
    let finishSaving = () => {};
    const slowStore: NoteStore = {
      ...store,
      async addImages(noteId, uris) {
        await new Promise<void>((resolve) => (finishSaving = resolve));
        return store.addImages(noteId, uris);
      },
    };
    const { imagePicker } = await renderAppWithStore(slowStore);
    await pressComposeButton('新增筆記');
    await screen.findByLabelText('筆記內文');
    imagePicker.next.camera = { status: 'picked', uris: ['content://camera/whiteboard.jpg'] };
    await pressComposeButtonWithoutWaiting('拍照');

    await testRouter.back('/');
    await act(async () => finishSaving());

    expect(await screen.findByText('（圖片）')).toBeOnTheScreen();
    expect(await store.listNotes()).toHaveLength(1);
  });

  describe('權限被拒絕', () => {
    let openSettings: jest.SpiedFunction<typeof Linking.openSettings>;
    beforeEach(() => {
      openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
      openSettings.mockClear();
    });

    it.each([
      ['相機', '拍照', 'camera', '需要相機權限'],
      ['相簿', '從相簿選圖', 'library', '需要相片權限'],
    ] as const)('%s：說明原因，按「前往設定」打開系統設定', async (_, button, kind, title) => {
      const { imagePicker } = await renderApp('停車位');
      await fireEvent.press(await screen.findByText('停車位'));
      imagePicker.next[kind] = { status: 'denied' };

      await pressComposeButton(button);

      expect(await findComposeText(title)).toBeTruthy();
      await pressComposeButton('前往設定');
      expect(openSettings).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(queryComposeText(title)).toBeNull());
    });

    it('按「取消」關閉說明，不打開系統設定', async () => {
      const { imagePicker } = await renderApp('停車位');
      await fireEvent.press(await screen.findByText('停車位'));
      imagePicker.next.camera = { status: 'denied' };
      await pressComposeButton('拍照');
      await findComposeText('需要相機權限');

      await pressComposeButton('取消');

      await waitFor(() => expect(queryComposeText('需要相機權限')).toBeNull());
      expect(openSettings).not.toHaveBeenCalled();
    });
  });
});
