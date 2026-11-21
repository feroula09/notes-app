import * as ExpoImagePicker from 'expo-image-picker';

import type { ImagePicker, PickResult } from './image-picker';

function toPickResult(result: ExpoImagePicker.ImagePickerResult): PickResult {
  if (result.canceled) return { status: 'canceled' };
  return { status: 'picked', uris: result.assets.map((asset) => asset.uri) };
}

export const expoImagePicker: ImagePicker = {
  async takePhoto() {
    const permission = await ExpoImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    return toPickResult(await ExpoImagePicker.launchCameraAsync({ mediaTypes: ['images'] }));
  },
  async pickFromLibrary() {
    // Android 13 以上用系統的相片挑選器，不需要權限（一定是 granted）；舊版 Android 才會真的詢問。
    const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };
    return toPickResult(
      await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
      }),
    );
  },
};
