import { Host, Icon, useMaterialColors } from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/theme/typography';

/** 列表沒有內容時的說明：48dp 圖示加一段文字，垂直置中。 */
export function EmptyState({
  icon,
  message,
}: {
  icon: ComponentProps<typeof Icon>['source'];
  message: string;
}) {
  const colors = useMaterialColors();
  return (
    <View style={styles.empty}>
      <Host matchContents>
        <Icon source={icon} size={48} tint={colors.onSurfaceVariant} />
      </Host>
      <Text style={[typography.bodyLarge, styles.emptyText, { color: colors.onSurfaceVariant }]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  emptyText: { textAlign: 'center' },
});
