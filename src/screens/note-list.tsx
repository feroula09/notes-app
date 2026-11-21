import AddIcon from '@expo/material-symbols/add.xml';
import CloseIcon from '@expo/material-symbols/close.xml';
import MoreVertIcon from '@expo/material-symbols/more_vert.xml';
import NoteStackIcon from '@expo/material-symbols/note_stack.xml';
import SearchIcon from '@expo/material-symbols/search.xml';
import SearchOffIcon from '@expo/material-symbols/search_off.xml';
import {
  Text as ComposeText,
  DockedSearchBar,
  DropdownMenu,
  DropdownMenuItem,
  FloatingActionButton,
  Host,
  Icon,
  IconButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { NoteRow, NoteRowDivider } from '@/components/note-row';
import type { NoteListItem } from '@/notes/note-store';
import { useNoteStore } from '@/notes/note-store-context';
import { typography } from '@/theme/typography';
import { formatUpdatedAt } from '@/utils/format-time';

type NoteSection = { title: '已置頂' | '其他' | null; data: NoteListItem[] };

/** 有置頂筆記時分成「已置頂」和「其他」兩區；沒有的話只有一區、不顯示標題。 */
function toSections(notes: NoteListItem[]): NoteSection[] {
  const pinned = notes.filter((note) => note.pinned);
  // 沒有筆記時回傳空陣列，SectionList 才會顯示 ListEmptyComponent。
  if (pinned.length === 0) return notes.length === 0 ? [] : [{ title: null, data: notes }];
  const others = notes.filter((note) => !note.pinned);
  return [
    { title: '已置頂', data: pinned },
    ...(others.length > 0 ? [{ title: '其他' as const, data: others }] : []),
  ];
}

export function NoteList() {
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
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
    // 搜尋字串變了之後才回來的舊結果直接丟掉，不蓋掉新的列表。
    let stale = false;
    const load = () =>
      store.listNotes(trimmed).then((notes) => {
        if (!stale) setList({ notes, query: trimmed, loadedAt: Date.now() });
      });
    void load();
    const unsubscribe = store.subscribe(load);
    return () => {
      stale = true;
      unsubscribe();
    };
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
            {/* 只在有搜尋字串時出現，按下去清空（patches/@expo+ui 加的原生功能）。 */}
            <DockedSearchBar.TrailingIcon>
              <Icon source={CloseIcon} contentDescription="清除搜尋" tint={colors.onSurfaceVariant} />
            </DockedSearchBar.TrailingIcon>
          </DockedSearchBar>
        </Host>
        {/* 設定（#13）之後也放在這個選單。 */}
        <Host matchContents>
          <DropdownMenu expanded={menuOpen} onDismissRequest={() => setMenuOpen(false)}>
            <DropdownMenu.Trigger>
              <IconButton onClick={() => setMenuOpen(true)}>
                <Icon source={MoreVertIcon} contentDescription="更多選項" />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Items>
              <DropdownMenuItem
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/trash');
                }}
              >
                <DropdownMenuItem.Text>
                  <ComposeText>回收桶</ComposeText>
                </DropdownMenuItem.Text>
              </DropdownMenuItem>
            </DropdownMenu.Items>
          </DropdownMenu>
        </Host>
      </View>
      {list && (
        <SectionList
          sections={toSections(list.notes)}
          keyExtractor={(note) => note.id}
          keyboardShouldPersistTaps="handled"
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          contentContainerStyle={[
            { paddingBottom: insets.bottom + 88 },
            list.notes.length === 0 && styles.emptyContainer,
          ]}
          renderSectionHeader={({ section }) =>
            section.title && (
              <Text
                accessibilityRole="header"
                style={[typography.titleSmall, styles.sectionHeader, { color: colors.primary }]}
              >
                {section.title}
              </Text>
            )
          }
          ItemSeparatorComponent={NoteRowDivider}
          ListEmptyComponent={
            list.query ? (
              <EmptyState icon={SearchOffIcon} message={`找不到含有『${list.query}』的筆記`} />
            ) : (
              <EmptyState icon={NoteStackIcon} message="還沒有筆記。按右下角的「＋」開始寫。" />
            )
          }
          renderItem={({ item }) => (
            <NoteRow
              title={item.title}
              preview={item.preview}
              time={formatUpdatedAt(item.updatedAt, list.loadedAt)}
              onPress={() => openNote(item.id)}
            />
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
  emptyContainer: { flexGrow: 1 },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  fab: { position: 'absolute' },
});
