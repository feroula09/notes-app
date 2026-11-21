import AddIcon from '@expo/material-symbols/add.xml';
import NoteStackIcon from '@expo/material-symbols/note_stack.xml';
import SearchIcon from '@expo/material-symbols/search.xml';
import SearchOffIcon from '@expo/material-symbols/search_off.xml';
import {
  Text as ComposeText,
  DockedSearchBar,
  FloatingActionButton,
  Host,
  Icon,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
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
  const [query, setQuery] = useState('');
  // loadedAt 用來判斷修改時間要顯示「今天幾點」還是日期；
  // query 是這份列表的搜尋字串，打字時列表還沒更新前，空狀態的說明不會對不上。
  const [list, setList] = useState<{
    notes: NoteListItem[];
    query: string;
    loadedAt: number;
  } | null>(null);
  // M3：內容捲到上方列底下時，上方列換成 surfaceContainer 色。
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    const load = () =>
      store
        .listNotes(trimmed)
        .then((notes) => setList({ notes, query: trimmed, loadedAt: Date.now() }));
    void load();
    return store.subscribe(load);
  }, [store, query]);

  function openNote(id: string) {
    router.push({ pathname: '/notes/[id]', params: { id } });
  }

  async function createNote() {
    const note = await store.createNote();
    openNote(note.id);
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <View
        style={[
          styles.bar,
          {
            paddingTop: insets.top + 8,
            backgroundColor: scrolled ? colors.surfaceContainer : colors.surface,
          },
        ]}
      >
        <Host matchContents={{ vertical: true }} ignoreSafeAreaKeyboardInsets style={styles.search}>
          <DockedSearchBar onQueryChange={setQuery} modifiers={[fillMaxWidth()]}>
            <DockedSearchBar.LeadingIcon>
              <Icon source={SearchIcon} tint={colors.onSurfaceVariant} />
            </DockedSearchBar.LeadingIcon>
            <DockedSearchBar.Placeholder>
              <ComposeText>搜尋筆記</ComposeText>
            </DockedSearchBar.Placeholder>
          </DockedSearchBar>
        </Host>
        {/* ⋮ 選單（回收桶、設定）的位置，等 #6、#13 有功能再放按鈕。 */}
        <View style={styles.menuSlot} />
      </View>
      {list && (
        <FlatList
          data={list.notes}
          keyExtractor={(note) => note.id}
          keyboardShouldPersistTaps="handled"
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
                <Icon
                  source={list.query ? SearchOffIcon : NoteStackIcon}
                  size={48}
                  tint={colors.onSurfaceVariant}
                />
              </Host>
              <Text
                style={[typography.bodyLarge, styles.emptyText, { color: colors.onSurfaceVariant }]}
              >
                {list.query
                  ? `找不到含有『${list.query}』的筆記`
                  : '還沒有筆記。按右下角的「＋」開始寫。'}
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
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  search: { flex: 1 },
  menuSlot: { width: 48, height: 48 },
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
