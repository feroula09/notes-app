import { FloatingActionButton, Host, Icon, useMaterialColors } from '@expo/ui/jetpack-compose';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NoteListItem } from '@/notes/note-store';
import { useNoteStore } from '@/notes/note-store-context';
import { formatUpdatedAt } from '@/utils/format-time';

export function NoteList() {
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  // loadedAt 用來判斷修改時間要顯示「今天幾點」還是日期。
  const [list, setList] = useState<{ notes: NoteListItem[]; loadedAt: number } | null>(null);

  useEffect(() => {
    const load = () =>
      store.listNotes().then((notes) => setList({ notes, loadedAt: Date.now() }));
    void load();
    return store.subscribe(load);
  }, [store]);

  function openNote(id: string) {
    router.push({ pathname: '/notes/[id]', params: { id } });
  }

  async function createNote() {
    const note = await store.createNote();
    openNote(note.id);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      {list && (
        <FlatList
          data={list.notes}
          keyExtractor={(note) => note.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.onSurfaceVariant }]}>
              還沒有筆記。按右下角的「＋」開始寫。
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              android_ripple={{ color: colors.onSurface + '1f' }}
              onPress={() => openNote(item.id)}
              style={styles.item}
            >
              <View style={styles.itemHeader}>
                <Text numberOfLines={1} style={[styles.title, { color: colors.onSurface }]}>
                  {item.title}
                </Text>
                <Text style={[styles.time, { color: colors.onSurfaceVariant }]}>
                  {formatUpdatedAt(item.updatedAt, list.loadedAt)}
                </Text>
              </View>
              {item.preview !== '' && (
                <Text numberOfLines={2} style={[styles.preview, { color: colors.onSurfaceVariant }]}>
                  {item.preview}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
      <View style={[styles.fab, { bottom: insets.bottom + 16, right: insets.right + 16 }]}>
        <Host matchContents>
          <FloatingActionButton onClick={createNote}>
            <FloatingActionButton.Icon>
              <Icon source={require('../../assets/icons/add.xml')} contentDescription="新增筆記" />
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 32, paddingTop: 96 },
  item: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 72 },
  itemHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  title: { flex: 1, fontSize: 16, lineHeight: 24, fontWeight: '500' },
  time: { fontSize: 12, lineHeight: 16 },
  preview: { fontSize: 14, lineHeight: 20, marginTop: 2 },
  fab: { position: 'absolute' },
});
