import * as Crypto from 'expo-crypto';
import { useEffect, useState } from 'react';

import { RootStack } from '@/components/root-stack';
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

  useEffect(() => {
    void openAppNoteStore().then(setStore);
  }, []);

  // 開啟資料庫通常只要幾毫秒，期間維持啟動畫面。
  if (!store) return null;

  return (
    <NoteStoreProvider store={store}>
      <RootStack />
    </NoteStoreProvider>
  );
}
