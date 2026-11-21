import type { ImagePicker, PickResult } from '@/image-picker/image-picker';

/** 假的相機和相簿：測試先設定下一次拍照或選圖的結果，預設是使用者取消。 */
export function createFakeImagePicker() {
  const next: { camera: PickResult; library: PickResult } = {
    camera: { status: 'canceled' },
    library: { status: 'canceled' },
  };
  const picker: ImagePicker = {
    takePhoto: async () => next.camera,
    pickFromLibrary: async () => next.library,
  };
  return { picker, next };
}
