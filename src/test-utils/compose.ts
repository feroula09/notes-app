import { act, screen, waitFor } from 'expo-router/testing-library';

/**
 * 找到 @expo/ui（Jetpack Compose）的控制項。
 *
 * Compose 元件在 Jest 裡只是 native view mock，RNTL 的 role 查詢和 press 都找不到它們；
 * 這裡用圖示的 contentDescription（也就是 TalkBack 唸出來的名稱）或 Compose Text 的文字找到元件，
 * 再往上找到帶有 handler 這個事件的控制項。
 */
async function findComposeControl(label: string, handler: string) {
  const labelNode = await waitFor(() => {
    const [match] = screen.container.queryAll(
      (node) => node.props.contentDescription === label || node.props.text === label,
    );
    if (!match) throw new Error(`找不到 contentDescription 或文字為「${label}」的 Compose 元件`);
    return match;
  });
  let control = labelNode.parent;
  while (control && typeof control.props[handler] !== 'function') control = control.parent;
  if (!control) throw new Error(`「${label}」不在有 ${handler} 的 Compose 控制項裡`);
  return control;
}

/** 按下 Compose 按鈕（IconButton、FloatingActionButton、TextButton…）。 */
export async function pressComposeButton(label: string) {
  const { onButtonPressed } = (await findComposeControl(label, 'onButtonPressed')).props;
  await act(async () => {
    await onButtonPressed();
  });
}

/**
 * 按下 Compose 按鈕，但和實機的原生事件一樣只觸發、不等處理函式跑完：
 * 用來測試處理函式還在跑的時候使用者又做了別的事（例如馬上返回）。
 */
export async function pressComposeButtonWithoutWaiting(label: string) {
  const { onButtonPressed } = (await findComposeControl(label, 'onButtonPressed')).props;
  await act(async () => {
    void onButtonPressed();
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

/**
 * 按下 Compose 選單（DropdownMenu）裡文字為 label 的項目。
 *
 * 和實機的原生事件一樣只觸發、不等處理函式跑完：處理函式可能在等 snackbar 的結果。
 */
export async function pressComposeMenuItem(label: string) {
  const { onItemPressed } = (await findComposeControl(label, 'onItemPressed')).props;
  await act(async () => {
    void onItemPressed();
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

/** 畫面上文字為 text 的 Compose Text（例如對話框的標題）；沒有時是 null。 */
export function queryComposeText(text: string) {
  return screen.container.queryAll((node) => node.props.text === text)[0] ?? null;
}

/** 等到畫面上出現文字為 text 的 Compose Text。 */
export function findComposeText(text: string) {
  return waitFor(() => {
    const match = queryComposeText(text);
    if (!match) throw new Error(`找不到文字為「${text}」的 Compose Text`);
    return match;
  });
}
