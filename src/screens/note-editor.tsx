import ArrowBackIcon from '@expo/material-symbols/arrow_back.xml';
import KeepIcon from '@expo/material-symbols/keep.xml';
import {
  Host,
  Icon,
  IconButton,
  IconToggleButton,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import KeepFillIcon from '@/icons/keep_fill.xml';
import { useNoteStore } from '@/notes/note-store-context';
import { typography } from '@/theme/typography';
import { formatClock } from '@/utils/format-time';

const SAVE_DELAY_MS = 500;

export function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const unsaved = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 工具列下方的空間：鍵盤收起時讓出導覽列，打開時剛好是鍵盤高度，逐格跟著鍵盤移動。
  const keyboard = useReanimatedKeyboardAnimation();
  const bottomSpace = useAnimatedStyle(() => ({
    height: Math.max(-keyboard.height.value, insets.bottom),
  }));

  useEffect(() => {
    void store.getNote(id).then((note) => {
      setBody(note?.body ?? '');
      setSavedAt(note?.updatedAt ?? null);
      setIsPinned(note?.pinned ?? false);
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

  async function togglePinned(checked: boolean) {
    setIsPinned(checked);
    await store.setPinned([id], checked);
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
    <View style={[styles.screen, { backgroundColor: colors.surface }]}>
      <Host matchContents={{ vertical: true }} ignoreSafeAreaKeyboardInsets style={styles.bar}>
        <TopAppBar>
          <TopAppBar.NavigationIcon>
            <IconButton onClick={() => router.back()}>
              <Icon source={ArrowBackIcon} contentDescription="返回" />
            </IconButton>
          </TopAppBar.NavigationIcon>
          {/* 筆記載入完才顯示，不然載入前按下去的狀態會被載入結果蓋掉。 */}
          {body !== null && (
            <TopAppBar.Actions>
              {/* 置頂時是實心圖示加上 M3 的 checked 色；TalkBack 會唸出開關狀態，所以名稱固定是「置頂」。 */}
              <IconToggleButton checked={isPinned} onCheckedChange={togglePinned}>
                <Icon source={isPinned ? KeepFillIcon : KeepIcon} contentDescription="置頂" />
              </IconToggleButton>
            </TopAppBar.Actions>
          )}
        </TopAppBar>
      </Host>
      {body !== null && (
        <TextInput
          accessibilityLabel="筆記內文"
          autoFocus={body === ''}
          cursorColor={colors.primary}
          selectionColor={colors.primary + '66'}
          defaultValue={body}
          multiline
          onChangeText={onChangeText}
          placeholder="筆記"
          placeholderTextColor={colors.onSurfaceVariant}
          style={[typography.bodyLarge, styles.input, { color: colors.onSurface }]}
          textAlignVertical="top"
        />
      )}
      <View style={styles.toolbar}>
        {savedAt !== null && (
          <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>
            已儲存・{formatClock(savedAt)}
          </Text>
        )}
      </View>
      <Animated.View style={bottomSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { width: '100%' },
  input: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  toolbar: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
