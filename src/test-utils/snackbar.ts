import type { SnackbarResult, SnackbarShowOptions } from '@expo/ui/jetpack-compose';
import { act } from 'expo-router/testing-library';

import type { ShowSnackbar } from '@/components/snackbar';

/**
 * 假的 snackbar：記下畫面要求顯示的 snackbar，再由測試決定使用者按了動作按鈕還是讓它消失。
 */
export function createFakeSnackbar() {
  const shown: { options: SnackbarShowOptions; respond: (result: SnackbarResult) => void }[] = [];
  const show: ShowSnackbar = (options) =>
    new Promise((respond) => shown.push({ options, respond }));

  return {
    show,
    /** 目前顯示過的 snackbar 訊息（含動作按鈕的文字）。 */
    messages: () => shown.map(({ options }) => [options.message, options.actionLabel]),
    /** 按下最近一個 snackbar 的動作按鈕。 */
    async pressAction() {
      await act(async () => shown.at(-1)!.respond('actionPerformed'));
    },
  };
}
