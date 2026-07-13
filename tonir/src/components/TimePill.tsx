import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Theme, FONTS} from '../theme';

interface TimePillProps {
  time: string;
  active?: boolean;
  t: Theme;
  onPress?: () => void;
  perk?: string;
  size?: 'sm' | 'md' | 'lg';
  dark?: boolean;
  light?: boolean;
}

export function TimePill({ time, active = false, t, onPress, perk, size = 'md', dark = false, light = false }: TimePillProps) {
  const sz = SIZES[size];

  let bgColor: string;
  let textColor: string;
  let borderWidth: number;
  let borderColor: string;

  if (light) {
    bgColor = active ? t.primary : t.surface;
    textColor = active ? '#FBF5E8' : t.text;
    borderWidth = active ? 0 : 1;
    borderColor = active ? 'transparent' : t.border;
  } else if (dark) {
    bgColor = active ? '#FBF5E8' : 'rgba(251,245,232,0.18)';
    textColor = active ? t.primaryDeep : '#FBF5E8';
    borderWidth = active ? 2 : 0;
    borderColor = active ? t.accent : 'transparent';
  } else {
    bgColor = t.primary;
    textColor = '#FBF5E8';
    borderWidth = active ? 2 : 0;
    borderColor = active ? t.accent : 'transparent';
  }

  return (
    <View style={{ position: 'relative' }}>
      <Pressable
        onPress={onPress}
        style={[
          styles.base,
          {
            paddingVertical: sz.py,
            paddingHorizontal: sz.px,
            backgroundColor: bgColor,
            borderWidth,
            borderColor,
          },
        ]}
      >
        <Text style={[styles.label, { fontSize: sz.fs, color: textColor }]}>
          {time}
        </Text>
      </Pressable>
      {perk && (
        <View
          style={[
            styles.perkBadge,
            { backgroundColor: t.accent },
          ]}
        >
          <Text style={[styles.perkText, { color: t.primaryDeep }]}>{perk}</Text>
        </View>
      )}
    </View>
  );
}

const SIZES = {
  sm: { fs: 11.5, py: 6, px: 9 },
  md: { fs: 13, py: 8, px: 12 },
  lg: { fs: 14, py: 10, px: 14 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  perkBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  perkText: {
    fontSize: 9,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: 0.4,
  },
});
