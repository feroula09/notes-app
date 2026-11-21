import { useMaterialColors } from '@expo/ui/jetpack-compose';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '@/theme/typography';

/** 筆記列表的一列：標題一行、時間靠右、預覽兩行；footer 是額外的一行說明（例如回收桶的剩餘天數）。 */
export function NoteRow({
  title,
  preview,
  time,
  footer,
  onPress,
}: {
  title: string;
  preview: string;
  time: string;
  footer?: string;
  onPress: () => void;
}) {
  const colors = useMaterialColors();
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: colors.onSurface + '1a' }}
      onPress={onPress}
      style={styles.item}
    >
      <View style={styles.itemHeader}>
        <Text
          numberOfLines={1}
          style={[typography.titleMedium, styles.title, { color: colors.onSurface }]}
        >
          {title}
        </Text>
        <Text style={[typography.bodySmall, { color: colors.onSurfaceVariant }]}>{time}</Text>
      </View>
      {preview !== '' && (
        <Text
          numberOfLines={2}
          style={[typography.bodyMedium, styles.secondLine, { color: colors.onSurfaceVariant }]}
        >
          {preview}
        </Text>
      )}
      {footer !== undefined && (
        <Text style={[typography.bodySmall, styles.secondLine, { color: colors.onSurfaceVariant }]}>
          {footer}
        </Text>
      )}
    </Pressable>
  );
}

/** 同一區列表項目之間的分隔線。 */
export function NoteRowDivider() {
  const colors = useMaterialColors();
  return <View style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />;
}

const styles = StyleSheet.create({
  item: { paddingHorizontal: 16, paddingVertical: 12, minHeight: 56, justifyContent: 'center' },
  itemHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 16 },
  title: { flex: 1 },
  secondLine: { marginTop: 4 },
  divider: { height: 1, marginHorizontal: 16 },
});
