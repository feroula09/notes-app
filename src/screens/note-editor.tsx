import ArrowBackIcon from '@expo/material-symbols/arrow_back.xml';
import CloseIcon from '@expo/material-symbols/close.xml';
import KeepIcon from '@expo/material-symbols/keep.xml';
import MoreVertIcon from '@expo/material-symbols/more_vert.xml';
import PhotoCameraIcon from '@expo/material-symbols/photo_camera.xml';
import PhotoLibraryIcon from '@expo/material-symbols/photo_library.xml';
import {
  AlertDialog,
  Text as ComposeText,
  DropdownMenu,
  DropdownMenuItem,
  FilledTonalIconButton,
  Host,
  Icon,
  IconButton,
  IconToggleButton,
  Row,
  TextButton,
  TopAppBar,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useShowSnackbar } from '@/components/snackbar';
import KeepFillIcon from '@/icons/keep_fill.xml';
import { useImagePicker, type PickResult } from '@/image-picker/image-picker';
import { isEmptyNote, type Note, type NoteImage } from '@/notes/note-store';
import { useNoteStore } from '@/notes/note-store-context';
import { typography } from '@/theme/typography';
import { formatClock } from '@/utils/format-time';

const SAVE_DELAY_MS = 500;

type ImageSource = 'camera' | 'library';

/** 權限被拒絕時的說明。 */
const PERMISSION_DENIED: Record<ImageSource, { title: string; message: string }> = {
  camera: {
    title: '需要相機權限',
    message: '要拍照加入筆記，請到系統設定允許這個 APP 使用相機。',
  },
  library: {
    title: '需要相片權限',
    message: '要從相簿選圖，請到系統設定允許這個 APP 存取相片。',
  },
};

export function NoteEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useNoteStore();
  const colors = useMaterialColors();
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [images, setImages] = useState<NoteImage[]>([]);
  const [deniedSource, setDeniedSource] = useState<ImageSource | null>(null);
  const imagePicker = useImagePicker();
  const showSnackbar = useShowSnackbar();
  const unsaved = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // 正在加入（壓縮、存檔）的附圖；離開畫面時要等它存好，才判斷是不是空白筆記。
  const addingImages = useRef<Promise<unknown>>(Promise.resolve());

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
      setImages(note?.images ?? []);
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

  async function addImagesFrom(source: ImageSource) {
    const result: PickResult =
      source === 'camera' ? await imagePicker.takePhoto() : await imagePicker.pickFromLibrary();
    if (result.status === 'denied') setDeniedSource(source);
    if (result.status !== 'picked') return;
    const adding = store.addImages(id, result.uris);
    addingImages.current = adding;
    showImages(await adding);
  }

  async function removeImage(imageId: string) {
    showImages(await store.removeImage(id, imageId));
  }

  function showImages(note: Note) {
    setImages(note.images);
    setSavedAt(note.updatedAt);
  }

  function openSettings() {
    setDeniedSource(null);
    void Linking.openSettings();
  }

  async function moveToTrash() {
    setMenuOpen(false);
    await save();
    // 空白筆記不進回收桶（ADR 0001）：直接離開，讓 discardIfEmpty 刪掉，也就沒有可以復原的東西。
    const note = await store.getNote(id);
    if (note && isEmptyNote(note)) {
      router.back();
      return;
    }
    await store.moveToTrash([id]);
    router.back();
    const result = await showSnackbar({
      message: '已移到回收桶',
      actionLabel: '復原',
      duration: 'short',
    });
    if (result === 'actionPerformed') await store.undoMoveToTrash([id]);
  }

  function onChangeText(text: string) {
    unsaved.current = text;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY_MS);
  }

  // 離開畫面（返回鍵、返回手勢、上方列返回）時立即寫入，並捨棄空白筆記。
  const onLeave = useEffectEvent(() => {
    void Promise.all([save(), addingImages.current]).then(() => store.discardIfEmpty(id));
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
              <DropdownMenu expanded={menuOpen} onDismissRequest={() => setMenuOpen(false)}>
                <DropdownMenu.Trigger>
                  <IconButton onClick={() => setMenuOpen(true)}>
                    <Icon source={MoreVertIcon} contentDescription="更多選項" />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Items>
                  <DropdownMenuItem onClick={moveToTrash}>
                    <DropdownMenuItem.Text>
                      <ComposeText>移到回收桶</ComposeText>
                    </DropdownMenuItem.Text>
                  </DropdownMenuItem>
                </DropdownMenu.Items>
              </DropdownMenu>
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
      {images.length > 0 && (
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="always"
          style={styles.attachments}
          contentContainerStyle={styles.attachmentsContent}
        >
          {images.map((image, index) => (
            <View key={image.id}>
              <Image
                accessibilityLabel={`第 ${index + 1} 張附圖`}
                source={{ uri: image.uri }}
                contentFit="cover"
                style={[styles.thumbnail, { backgroundColor: colors.surfaceContainerHigh }]}
              />
              <Host matchContents style={styles.removeImage}>
                <FilledTonalIconButton onClick={() => removeImage(image.id)}>
                  <Icon source={CloseIcon} contentDescription={`移除第 ${index + 1} 張附圖`} />
                </FilledTonalIconButton>
              </Host>
            </View>
          ))}
        </ScrollView>
      )}
      <View style={styles.toolbar}>
        <Host matchContents>
          <Row>
            <IconButton onClick={() => addImagesFrom('camera')}>
              <Icon source={PhotoCameraIcon} contentDescription="拍照" />
            </IconButton>
            <IconButton onClick={() => addImagesFrom('library')}>
              <Icon source={PhotoLibraryIcon} contentDescription="從相簿選圖" />
            </IconButton>
          </Row>
        </Host>
        {savedAt !== null && (
          <Text style={[typography.bodySmall, styles.savedAt, { color: colors.onSurfaceVariant }]}>
            已儲存・{formatClock(savedAt)}
          </Text>
        )}
      </View>
      {deniedSource !== null && (
        <Host matchContents>
          <AlertDialog onDismissRequest={() => setDeniedSource(null)}>
            <AlertDialog.Title>
              <ComposeText>{PERMISSION_DENIED[deniedSource].title}</ComposeText>
            </AlertDialog.Title>
            <AlertDialog.Text>
              <ComposeText>{PERMISSION_DENIED[deniedSource].message}</ComposeText>
            </AlertDialog.Text>
            <AlertDialog.ConfirmButton>
              <TextButton onClick={openSettings}>
                <ComposeText>前往設定</ComposeText>
              </TextButton>
            </AlertDialog.ConfirmButton>
            <AlertDialog.DismissButton>
              <TextButton onClick={() => setDeniedSource(null)}>
                <ComposeText>取消</ComposeText>
              </TextButton>
            </AlertDialog.DismissButton>
          </AlertDialog>
        </Host>
      )}
      <Animated.View style={bottomSpace} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: { width: '100%' },
  input: { flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  attachments: { flexGrow: 0 },
  attachmentsContent: { gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  thumbnail: { width: 96, height: 96 },
  removeImage: { position: 'absolute', top: 0, right: 0 },
  // 圖示按鈕本身有 4dp 留白，左邊只再留 4dp，圖示就和內文的 16dp 對齊。
  toolbar: {
    minHeight: 48,
    paddingStart: 4,
    paddingEnd: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedAt: { marginStart: 'auto' },
});
