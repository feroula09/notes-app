import {
  Host,
  SnackbarHost,
  type SnackbarHostRef,
  type SnackbarResult,
  type SnackbarShowOptions,
} from '@expo/ui/jetpack-compose';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** 顯示 snackbar；使用者按了動作按鈕就回傳 'actionPerformed'，時間到或被關掉是 'dismissed'。 */
export type ShowSnackbar = (options: SnackbarShowOptions) => Promise<SnackbarResult>;

/** 測試會換成假的 ShowSnackbar：Compose 的 SnackbarHost 在 Jest 裡沒有原生方法可以呼叫。 */
export const SnackbarContext = createContext<ShowSnackbar | null>(null);

/** 整個 APP 共用一個 SnackbarHost，所以換頁之後 snackbar 還在。 */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const host = useRef<SnackbarHostRef>(null);
  const insets = useSafeAreaInsets();
  // 顯示中（含排隊中）的 snackbar 數量。
  const [pending, setPending] = useState(0);
  const show: ShowSnackbar = async (options) => {
    setPending((n) => n + 1);
    try {
      return await host.current!.showSnackbar(options);
    } finally {
      setPending((n) => n - 1);
    }
  };

  return (
    <SnackbarContext.Provider value={show}>
      {children}
      {/*
        放在 FAB 上方（56dp＋上下各 16dp），M3 的 snackbar 不蓋住 FAB。
        snackbar 消失後 Host 仍維持原本的大小，沒有 snackbar 時讓觸控穿過去，不擋住下面的列表。
      */}
      <View
        pointerEvents={pending > 0 ? 'box-none' : 'none'}
        style={[styles.host, { bottom: insets.bottom + 88 }]}
      >
        <Host matchContents={{ vertical: true }}>
          <SnackbarHost ref={host} />
        </Host>
      </View>
    </SnackbarContext.Provider>
  );
}

export function useShowSnackbar(): ShowSnackbar {
  const show = useContext(SnackbarContext);
  if (!show) throw new Error('useShowSnackbar 必須在 SnackbarProvider 裡使用');
  return show;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0 },
});
