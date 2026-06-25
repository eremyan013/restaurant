import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme, FONTS} from '../theme';

interface ChipProps {
  label: string;
  active?: boolean;
  t: Theme;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  accessibilityRole?: React.ComponentProps<typeof Pressable>['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityState?: React.ComponentProps<typeof Pressable>['accessibilityState'];
}

export function Chip({ label, active = false, t, onPress, size = 'md', style, accessibilityRole, accessibilityLabel, accessibilityState }: ChipProps) {
  const sz = SIZES[size];
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      onPress={onPress ? () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      } : undefined}
      style={[
        styles.base,
        {
          paddingVertical: sz.py,
          paddingHorizontal: sz.px,
          backgroundColor: active ? t.primary : t.surface,
          borderColor: active ? t.primary : t.border,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            fontSize: sz.fs,
            color: active ? '#FBF5E8' : t.text,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const SIZES = {
  sm: { px: 10, py: 5, fs: 12 },
  md: { px: 14, py: 8, fs: 13 },
  lg: { px: 18, py: 11, fs: 14 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontFamily: FONTS.medium, fontWeight: '500',
    letterSpacing: -0.1,
  },
});
