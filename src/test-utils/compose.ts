import { act, screen, waitFor } from 'expo-router/testing-library';

/**
 * 按下 @expo/ui（Jetpack Compose）的按鈕。
 *
 * Compose 元件在 Jest 裡只是 native view mock，RNTL 的 role 查詢和 press 都找不到它們；
 * 這裡用圖示的 contentDescription（也就是 TalkBack 唸出來的名稱）找到按鈕，再觸發它的點擊事件。
 */
export async function pressComposeButton(label: string) {
  const icon = await waitFor(() => {
    const [match] = screen.container.queryAll((node) => node.props.contentDescription === label);
    if (!match) throw new Error(`找不到 contentDescription 為「${label}」的 Compose 元件`);
    return match;
  });
  let button = icon.parent;
  while (button && typeof button.props.onButtonPressed !== 'function') button = button.parent;
  if (!button) throw new Error(`「${label}」不在可以按的 Compose 按鈕裡`);
  const onButtonPressed = button.props.onButtonPressed;
  await act(async () => {
    await onButtonPressed();
  });
}

/**
 * 在 @expo/ui 的 DockedSearchBar 裡輸入文字。
 *
 * 用 placeholder 文字（Compose Text 的 text prop）找到搜尋列，再觸發它的 onQueryChange 事件，
 * 和實機上每打一個字送出的事件相同。
 */
export async function typeInComposeSearchBar(placeholder: string, text: string) {
  const label = await waitFor(() => {
    const [match] = screen.container.queryAll((node) => node.props.text === placeholder);
    if (!match) throw new Error(`找不到 placeholder 為「${placeholder}」的 Compose 搜尋列`);
    return match;
  });
  let searchBar = label.parent;
  while (searchBar && typeof searchBar.props.onQueryChange !== 'function') searchBar = searchBar.parent;
  if (!searchBar) throw new Error(`「${placeholder}」不在 Compose 搜尋列裡`);
  const onQueryChange = searchBar.props.onQueryChange;
  await act(async () => {
    await onQueryChange({ nativeEvent: { value: text } });
  });
}
