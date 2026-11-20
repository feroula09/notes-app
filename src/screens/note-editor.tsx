import { useMaterialColors } from '@expo/ui/jetpack-compose';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNoteStore } from '@/notes/note-store-context';
import { formatClock } from '@/utils/format-time';

const SAVE_DELAY_MS = 500;

export function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const unsaved = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    void store.getNote(id).then((note) => {
      setBody(note?.body ?? '');
      setSavedAt(note?.updatedAt ?? null);
    });
  }, [store, id]);

  async function save() {
    clearTimeout(timer.current);
    if (unsaved.current === null) return;
    const text = unsaved.current;
    unsaved.current = null;
    const note = await store.updateBody(id, text);
    setSavedAt(note.updatedAt);
  }

  function onChangeText(text: string) {
    unsaved.current = text;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  }

  // 離開畫面（返回鍵、返回手勢、上方列返回）時立即寫入，並捨棄空白筆記。
  const onLeave = useEffectEvent(() => {
    void save().then(() => store.discardIfEmpty(id));
  });
  useEffect(() => () => onLeave(), []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.surface, paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerRight: () =>
            savedAt !== null && (
              <Text style={[styles.saved, { color: colors.onSurfaceVariant }]}>
                已儲存・{formatClock(savedAt)}
              </Text>
            ),
        }}
      />
      {body !== null && (
        <TextInput
          accessibilityLabel="筆記內文"
          autoFocus={body === ''}
          defaultValue={body}
          multiline
          onChangeText={onChangeText}
          placeholder="筆記"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[styles.input, { color: colors.onSurface }]}
          textAlignVertical="top"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  input: { flex: 1, fontSize: 16, lineHeight: 24, paddingHorizontal: 16, paddingVertical: 12 },
  saved: { fontSize: 12, lineHeight: 16 },
});
