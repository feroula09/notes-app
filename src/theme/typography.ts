import type { TextStyle } from 'react-native';

/**
 * Material 3 字級。Android 上 fontSize 的單位就是 sp，會跟著系統字體大小縮放。
 * 不設 fontFamily：系統會用 Roboto，中文自動換成 Noto Sans TC。
 * 不加 M3 的 letterSpacing：那是為拉丁字母設計的，加在中文上反而會把字拆散。
 * titleMedium、titleSmall 用 600 而不是 M3 的 500：Samsung 等機型的中文字體沒有 Medium，
 * 500 會讓標題裡的中文變回一般粗細、數字和英文卻是 Medium，同一行粗細不一致。
 */
export const typography = {
  titleMedium: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  titleSmall: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontSize: 14, lineHeight: 20 },
  bodySmall: { fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;
