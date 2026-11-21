import ArrowBackIcon from '@expo/material-symbols/arrow_back.xml';
import DeleteIcon from '@expo/material-symbols/delete.xml';
import {
  Text as ComposeText,
  Host,
  Icon,
  IconButton,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { NoteRow, NoteRowDivider } from '@/components/note-row';
import { TRASH_RETENTION_DAYS, type TrashListItem } from '@/notes/note-store';
import { useNoteStore } from '@/notes/note-store-context';
import { formatUpdatedAt } from '@/utils/format-time';

export function TrashList() {
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  // loadedAt 用來判斷修改時間要顯示「今天幾點」還是日期。
  const [list, setList] = useState<{ notes: TrashListItem[]; loadedAt: number } | null>(null);
  // M3：內容捲到上方列底下時，上方列換成 surfaceContainer 色。
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const load = () => store.listTrash().then((notes) => setList({ notes, loadedAt: Date.now() }));
    void load();
    return store.subscribe(load);
  }, [store]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Host matchContents={{ vertical: true }} ignoreSafeAreaKeyboardInsets style={styles.bar}>
        <TopAppBar colors={{ containerColor: scrolled ? colors.surfaceContainer : colors.surface }}>
          <TopAppBar.NavigationIcon>
            <IconButton onClick={() => router.back()}>
              <Icon source={ArrowBackIcon} contentDescription="返回" />
            </IconButton>
          </TopAppBar.NavigationIcon>
          <TopAppBar.Title>
            <ComposeText style={{ typography: 'titleLarge' }}>回收桶</ComposeText>
          </TopAppBar.Title>
        </TopAppBar>
      </Host>
      {list && (
        <FlatList
          data={list.notes}
          keyExtractor={(note) => note.id}
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          contentContainerStyle={[
            { paddingBottom: insets.bottom + 16 },
            list.notes.length === 0 && styles.emptyContainer,
          ]}
          ItemSeparatorComponent={NoteRowDivider}
          ListEmptyComponent={
            <EmptyState
              icon={DeleteIcon}
              message={`回收桶是空的。移到回收桶的筆記會保留 ${TRASH_RETENTION_DAYS} 天，之後永久刪除。`}
            />
          }
          renderItem={({ item }) => (
            <NoteRow
              title={item.title}
              preview={item.preview}
              thumbnailUri={item.thumbnailUri}
              time={formatUpdatedAt(item.updatedAt, list.loadedAt)}
              footer={`${item.daysLeft} 天後永久刪除`}
              onPress={() => router.push({ pathname: '/trash/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { width: '100%' },
  emptyContainer: { flexGrow: 1 },
});
