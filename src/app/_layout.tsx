import { useMaterialColors } from '@expo/ui/jetpack-compose';
import * as Crypto from 'expo-crypto';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { RootStack } from '@/components/root-stack';
import { SnackbarProvider } from '@/components/snackbar';
import { systemClock } from '@/notes/clock';
import { openExpoSqliteDatabase } from '@/notes/expo-sqlite-database';
import { openNoteStore, type NoteStore } from '@/notes/note-store';
import { NoteStoreProvider } from '@/notes/note-store-context';

async function openAppNoteStore() {
  const db = await openExpoSqliteDatabase('notes.db');
  return openNoteStore({ db, clock: systemClock, newId: Crypto.randomUUID });
}

export default function RootLayout() {
  const [store, setStore] = useState<NoteStore | null>(null);
  const colors = useMaterialColors();

  useEffect(() => {
    void openAppNoteStore().then(setStore);
  }, []);

  // 視窗底色跟著 Material 配色（含深色模式），轉場和鍵盤動畫時不會露出白底。
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.surface);
  }, [colors.surface]);

  // 開啟資料庫通常只要幾毫秒，期間維持啟動畫面。
  if (!store) return null;

  return (
    <NoteStoreProvider store={store}>
      <KeyboardProvider>
        <StatusBar style="auto" />
        <SnackbarProvider>
          <RootStack />
        </SnackbarProvider>
      </KeyboardProvider>
    </NoteStoreProvider>
  );
}
