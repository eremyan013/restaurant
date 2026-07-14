import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme, FONTS} from '../theme';
import { Icon } from './Icon';

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  action?: string;
  onAction?: () => void;
  t: Theme;
  size?: 'sm' | 'md' | 'lg';
}

export function SectionHeader({
  title, eyebrow, action = 'Բոլորը', onAction, t, size = 'md',
}: SectionHeaderProps) {
  const titleSize = size === 'lg' ? 22 : size === 'sm' ? 16 : 18;
  return (
    <View style={styles.row}>
      <View>
        {eyebrow && (
          <Text style={[styles.eyebrow, { color: t.primary }]}>{eyebrow}</Text>
        )}
        <Text style={[styles.title, { fontSize: titleSize, color: t.text }]}>
          {title}
        </Text>
      </View>
      {action && onAction && (
        <Pressable onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onAction!();
        }} style={styles.actionBtn}>
          <Text style={[styles.actionLabel, { color: t.primary }]}>{action}</Text>
          <Icon name="arrow" size={14} color={t.primary} strokeWidth={2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
});
