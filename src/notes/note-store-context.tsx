import { createContext, useContext, type ReactNode } from 'react';

import type { NoteStore } from './note-store';

const NoteStoreContext = createContext<NoteStore | null>(null);

export function NoteStoreProvider({ store, children }: { store: NoteStore; children: ReactNode }) {
  return <NoteStoreContext.Provider value={store}>{children}</NoteStoreContext.Provider>;
}

export function useNoteStore(): NoteStore {
  const store = useContext(NoteStoreContext);
  if (!store) throw new Error('useNoteStore 必須在 NoteStoreProvider 裡使用');
  return store;
}
