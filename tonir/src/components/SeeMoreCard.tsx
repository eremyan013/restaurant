import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme, FONTS, SHADOWS } from '../theme';
import { Icon } from './Icon';

interface SeeMoreCardProps {
  t: Theme;
  label: string;
  sublabel: string;
  onPress: () => void;
}

export function SeeMoreCard({ t, label, sublabel, onPress }: SeeMoreCardProps) {
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, SHADOWS.card]}
    >
      <View style={styles.inner}>
        <View style={[styles.iconCircle, { backgroundColor: `${t.primary}18` }]}>
          <Icon name="arrow" size={24} color={t.primary} strokeWidth={2} />
        </View>
        <Text style={[styles.label, { color: t.text }]}>{label}</Text>
        <Text style={[styles.sub, { color: t.textMute }]}>{sublabel}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    minHeight: 268,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    flexShrink: 0,
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    textAlign: 'center',
  },
});
