import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ImageFiles } from './image-files';

/** 附圖存成 JPEG，長邊最多這麼多像素。 */
const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.8;

/** 附圖存在 APP 私有資料夾（documents/images），解除安裝前都不會被系統清掉。 */
export function openExpoImageFiles(): ImageFiles {
  const directory = new Directory(Paths.document, 'images');
  directory.create({ idempotent: true });

  return {
    async save(sourceUri, fileName) {
      // 解碼時就縮到邊界內，整張原圖不必載入記憶體。
      const image = await ImageManipulator.manipulate(sourceUri, {
        maxWidth: MAX_EDGE,
        maxHeight: MAX_EDGE,
      }).renderAsync();
      const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
      // saveAsync 存在快取資料夾，搬進私有資料夾才不會被系統清掉。
      new File(result.uri).move(new File(directory, fileName));
    },
    async delete(fileName) {
      const file = new File(directory, fileName);
      if (file.exists) file.delete();
    },
    uri: (fileName) => new File(directory, fileName).uri,
  };
}
