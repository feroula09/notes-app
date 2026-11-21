import { act, screen, waitFor } from 'expo-router/testing-library';

/**
 * 找到 @expo/ui（Jetpack Compose）的控制項。
 *
 * Compose 元件在 Jest 裡只是 native view mock，RNTL 的 role 查詢和 press 都找不到它們；
 * 這裡用圖示的 contentDescription（也就是 TalkBack 唸出來的名稱）找到圖示，
 * 再往上找到帶有 handler 這個事件的控制項。
 */
async function findComposeControl(label: string, handler: string) {
  const icon = await waitFor(() => {
    const [match] = screen.container.queryAll((node) => node.props.contentDescription === label);
    if (!match) throw new Error(`找不到 contentDescription 為「${label}」的 Compose 元件`);
    return match;
  });
  let control = icon.parent;
  while (control && typeof control.props[handler] !== 'function') control = control.parent;
  if (!control) throw new Error(`「${label}」不在有 ${handler} 的 Compose 控制項裡`);
  return control;
}

/** 按下 Compose 按鈕（IconButton、FloatingActionButton…）。 */
export async function pressComposeButton(label: string) {
  const { onButtonPressed } = (await findComposeControl(label, 'onButtonPressed')).props;
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

/** 切換 Compose 的 toggle 按鈕（IconToggleButton…），和實機上點一下相同。 */
export async function toggleComposeButton(label: string) {
  const { onCheckedChange, checked } = (await findComposeControl(label, 'onCheckedChange')).props;
  await act(async () => {
    await onCheckedChange({ nativeEvent: { checked: !checked } });
  });
}

/** Compose toggle 按鈕目前是否為開啟（TalkBack 唸出的開關狀態）。 */
export async function isComposeToggleChecked(label: string): Promise<boolean> {
  return (await findComposeControl(label, 'onCheckedChange')).props.checked;
}
