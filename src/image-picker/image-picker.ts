import { createContext, useContext } from 'react';

/** picked：選到的圖片 URI（依選取順序）；denied：使用者拒絕了相機或相簿權限。 */
export type PickResult =
  | { status: 'picked'; uris: string[] }
  | { status: 'canceled' }
  | { status: 'denied' };

/** 相機和相簿的小模組：畫面只透過它取得圖片，元件測試換成假實作。 */
export interface ImagePicker {
  takePhoto(): Promise<PickResult>;
  /** 可以多選。 */
  pickFromLibrary(): Promise<PickResult>;
}

/** APP 內是 expo-image-picker（src/image-picker/expo-image-picker.ts），測試換成假的。 */
export const ImagePickerContext = createContext<ImagePicker | null>(null);

export function useImagePicker(): ImagePicker {
  const picker = useContext(ImagePickerContext);
  if (!picker) throw new Error('useImagePicker 必須在 ImagePickerContext.Provider 裡使用');
  return picker;
}
