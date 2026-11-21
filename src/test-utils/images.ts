import { screen } from 'expo-router/testing-library';

import type { MemoryImageFiles } from '@/notes/testing';

/**
 * 畫面上無障礙名稱符合 label 的圖片（expo-image），由上到下、由左到右各是從哪個來源加入的。
 * expo-image 會把 source 正規化成陣列。
 */
export function imageSources(files: MemoryImageFiles, label: RegExp) {
  return screen
    .queryAllByLabelText(label)
    .map((image) => files.sourceOf(image.props.source[0].uri));
}
