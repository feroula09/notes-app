import AddIcon from '@expo/material-symbols/add.xml';
import NoteStackIcon from '@expo/material-symbols/note_stack.xml';
import {
  Text as ComposeText,
  FloatingActionButton,
  Host,
  Icon,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { NoteListItem } from '@/notes/note-store';
import { useNoteStore } from '@/notes/note-store-context';
import { typography } from '@/theme/typography';
import { formatUpdatedAt } from '@/utils/format-time';

export function NoteList() {
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  // loadedAt 用來判斷修改時間要顯示「今天幾點」還是日期。
  const [list, setList] = useState<{ notes: NoteListItem[]; loadedAt: number } | null>(null);
  // M3：內容捲到上方列底下時，上方列換成 surfaceContainer 色。
  const [scrolled, setScrolled] = useState(false);

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
      <Host matchContents={{ vertical: true }} ignoreSafeAreaKeyboardInsets style={styles.bar}>
        <TopAppBar colors={{ containerColor: scrolled ? colors.surfaceContainer : colors.surface }}>
          <TopAppBar.Title>
            <ComposeText style={{ typography: 'titleLarge' }}>筆記</ComposeText>
          </TopAppBar.Title>
        </TopAppBar>
      </Host>
      {list && (
        <FlatList
          data={list.notes}
          keyExtractor={(note) => note.id}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          contentContainerStyle={[
            { paddingBottom: insets.bottom + 88 },
            list.notes.length === 0 && styles.emptyContainer,
          ]}
          ItemSeparatorComponent={() => (
            <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Host matchContents>
                <Icon source={NoteStackIcon} size={48} tint={colors.onSurfaceVariant} />
              </Host>
              <Text
                style={[typography.bodyLarge, styles.emptyText, { color: colors.onSurfaceVariant }]}
              >
                還沒有筆記。按右下角的「＋」開始寫。
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              android_ripple={{ color: colors.onSurface + '1a' }}
              onPress={() => openNote(item.id)}
              style={styles.item}
            >
              <View style={styles.itemHeader}>
                <Text
                  numberOfLines={1}
                  style={[typography.titleMedium, styles.title, { color: colors.onSurface }]}
                >
                  {item.title}
                </Text>
                <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
                  {formatUpdatedAt(item.updatedAt, list.loadedAt)}
                </Text>
              </View>
              {item.preview !== '' && (
                <Text
                  numberOfLines={2}
                  style={[typography.bodyMedium, styles.preview, { color: colors.onSurfaceVariant }]}
                >
                  {item.preview}
                </Text>
              )}
            </Pressable>
          )}
        />
      )}
      <View style={[styles.fab, { bottom: insets.bottom + 16, right: insets.right + 16 }]}>
        <Host matchContents ignoreSafeAreaKeyboardInsets>
          <FloatingActionButton onClick={createNote}>
            <FloatingActionButton.Icon>
              <Icon source={AddIcon} contentDescription="新增筆記" />
            </FloatingActionButton.Icon>
          </FloatingActionButton>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { width: '100%' },
  emptyContainer: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  emptyText: { textAlign: 'center' },
  item: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, justifyContent: 'center' },
  itemHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  title: { flex: 1 },
  preview: { marginTop: 4 },
  divider: { height: 1, marginHorizontal: 16 },
  fab: { position: 'absolute' },
});
