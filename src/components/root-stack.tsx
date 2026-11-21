import { useMaterialColors } from '@expo/ui/jetpack-compose';
import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

export function RootStack() {
  const colors = useMaterialColors();
  // 系統關閉動畫時直接切換；其他時候用 Android 系統的轉場，返回手勢會跟著預覽上一頁。
  const reduceMotion = useReducedMotion();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: reduceMotion ? 'none' : 'default',
      }}
    />
  );
}
