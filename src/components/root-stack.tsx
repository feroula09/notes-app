import { Stack } from 'expo-router';

export function RootStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: '筆記' }} />
      <Stack.Screen name="notes/[id]" options={{ title: '' }} />
    </Stack>
  );
}
