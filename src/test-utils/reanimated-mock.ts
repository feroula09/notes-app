/**
 * Jest 用的 Reanimated。
 *
 * expo-router 的測試工具會用 `react-native-reanimated/mock` 取代 Reanimated，但那個 mock 在
 * jest-expo 的 Android preset 裡載入不了，失敗時 expo-router 會換成空物件，畫面一 import 就壞掉。
 * package.json 的 moduleNameMapper 把 `react-native-reanimated/mock` 指到這裡：
 * 動畫元件當成一般 View，動畫樣式不做事，系統沒有關閉動畫。
 */
import { View } from 'react-native';

module.exports = {
  __esModule: true,
  default: { View },
  useReducedMotion: () => false,
  useAnimatedStyle: () => ({}),
};
