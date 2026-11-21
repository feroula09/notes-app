import { fireEvent, screen, testRouter, waitFor } from 'expo-router/testing-library';

import { pressComposeButton, pressComposeMenuItem } from '@/test-utils/compose';
import { renderApp } from '@/test-utils/render-app';

/** 列表上這幾則筆記標題由上到下的順序。 */
function titlesInOrder(titles: string[]) {
  return screen
    .getAllByText(new RegExp(`^(${titles.join('|')})$`))
    .map((node) => node.props.children);
}

describe('回收桶', () => {
  it('在編輯頁移到回收桶：回到列表、筆記不見並出現 snackbar；按「復原」後筆記回到原位', async () => {
    const { snackbar } = await renderApp('最舊', '中間', '最新');
    await fireEvent.press(await screen.findByText('中間'));

    await pressComposeButton('更多選項');
    await pressComposeMenuItem('移到回收桶');

    await waitFor(() => expect(screen).toHavePathname('/'));
    await waitFor(() => expect(screen.queryByText('中間')).not.toBeOnTheScreen());
    expect(snackbar.messages()).toEqual([['已移到回收桶', '復原']]);

    await snackbar.pressAction();

    await screen.findByText('中間');
    expect(titlesInOrder(['最舊', '中間', '最新'])).toEqual(['最新', '中間', '最舊']);
  });

  it('空白筆記選「移到回收桶」：直接捨棄（ADR 0001），不進回收桶、也不出現沒辦法復原的 snackbar', async () => {
    const { store, snackbar } = await renderApp();
    await pressComposeButton('新增筆記');
    await screen.findByLabelText('筆記內文');

    await pressComposeButton('更多選項');
    await pressComposeMenuItem('移到回收桶');

    await waitFor(() => expect(screen).toHavePathname('/'));
    // 等到空白筆記真的被捨棄、列表回到第一次使用的樣子。
    expect(await screen.findByText(/按右下角的「＋」開始寫/)).toBeOnTheScreen();
    expect(await store.listNotes()).toEqual([]);
    expect(await store.listTrash()).toEqual([]);
    expect(snackbar.messages()).toEqual([]);
  });

  async function openTrash() {
    await pressComposeButton('更多選項');
    await pressComposeMenuItem('回收桶');
    await waitFor(() => expect(screen).toHavePathname('/trash'));
  }

  it('回收桶是空的時顯示說明', async () => {
    await renderApp('週末爬山');
    await screen.findByText('週末爬山');

    await openTrash();

    expect(await screen.findByText(/^回收桶是空的/)).toBeOnTheScreen();
  });

  it('回收桶列表顯示「N 天後永久刪除」；點開是唯讀畫面', async () => {
    const DAY = 24 * 60 * 60 * 1000;
    const BODY = '週末爬山\n記得帶外套';
    const { store, clock } = await renderApp(BODY, '買牛奶');
    await store.moveToTrash([(await store.listNotes('爬山'))[0].id]);
    clock.advance(DAY);
    await screen.findByText('買牛奶');

    await openTrash();
    expect(await screen.findByText('週末爬山')).toBeOnTheScreen();
    expect(screen.getByText('29 天後永久刪除')).toBeOnTheScreen();
    expect(screen.queryByText('買牛奶')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByText('週末爬山'));

    expect(await screen.findByText(BODY)).toBeOnTheScreen();
    // 唯讀：沒有可以編輯的輸入框。
    expect(screen.queryByDisplayValue(BODY)).not.toBeOnTheScreen();
  });

  it('從回收桶還原：筆記離開回收桶，回到列表最上面', async () => {
    const { store, clock } = await renderApp('週末爬山', '買牛奶');
    await store.moveToTrash([(await store.listNotes('爬山'))[0].id]);
    clock.advance(60_000);
    await openTrash();
    await fireEvent.press(await screen.findByText('週末爬山'));

    await pressComposeButton('還原');

    await waitFor(() => expect(screen).toHavePathname('/trash'));
    expect(await screen.findByText(/^回收桶是空的/)).toBeOnTheScreen();
    await testRouter.back('/');
    await screen.findByText('週末爬山');
    expect(titlesInOrder(['週末爬山', '買牛奶'])).toEqual(['週末爬山', '買牛奶']);
  });
});
