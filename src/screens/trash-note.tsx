import ArrowBackIcon from '@expo/material-symbols/arrow_back.xml';
import {
  Text as ComposeText,
  Host,
  Icon,
  IconButton,
  TextButton,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNoteStore } from '@/notes/note-store-context';
import { typography } from '@/theme/typography';

/** 回收桶裡的筆記只能看、不能編輯；可以還原。 */
export function TrashNote() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState<string | null>(null);
  // M3：內容捲到上方列底下時，上方列換成 surfaceContainer 色。
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    void store.getNote(id).then((note) => setBody(note?.body ?? ''));
  }, [store, id]);

  async function restore() {
    await store.restoreFromTrash([id]);
    router.back();
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Host matchContents={{ vertical: true }} ignoreSafeAreaKeyboardInsets style={styles.bar}>
        <TopAppBar colors={{ containerColor: scrolled ? colors.surfaceContainer : colors.surface }}>
          <TopAppBar.NavigationIcon>
            <IconButton onClick={() => router.back()}>
              <Icon source={ArrowBackIcon} contentDescription="返回" />
            </IconButton>
          </TopAppBar.NavigationIcon>
          <TopAppBar.Actions>
            <TextButton onClick={restore}>
              <ComposeText>還原</ComposeText>
            </TextButton>
          </TopAppBar.Actions>
        </TopAppBar>
      </Host>
      {body !== null && (
        <ScrollView
          onScroll={(e) => setScrolled(e.nativeEvent.contentOffset.y > 0)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        >
          <Text selectable style={[typography.bodyLarge, styles.body, { color: colors.onSurface }]}>
            {body}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { width: '100%' },
  body: { paddingHorizontal: 16, paddingTop: 8 },
});
