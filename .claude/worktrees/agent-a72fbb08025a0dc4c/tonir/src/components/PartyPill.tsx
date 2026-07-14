import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Theme, FONTS} from '../theme';
import { Icon } from './Icon';

interface PartyPillProps {
  people: number;
  time: string;
  t: Theme;
  onPress?: () => void;
  dark?: boolean;
}

export function PartyPill({ people, time, t, onPress, dark = false }: PartyPillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: dark ? t.primary : t.surface,
          borderColor: dark ? 'transparent' : t.borderStrong,
          borderWidth: dark ? 0 : 1,
        },
      ]}
    >
      <Icon name="users" size={14} color={dark ? '#FBF5E8' : t.text} strokeWidth={2} />
      <Text style={[styles.label, { color: dark ? '#FBF5E8' : t.text }]}>{people}</Text>
      <View style={[styles.dot, { backgroundColor: dark ? 'rgba(251,245,232,0.4)' : t.textFaint }]} />
      <Icon name="clock" size={13} color={dark ? '#FBF5E8' : t.text} strokeWidth={2} />
      <Text style={[styles.label, { color: dark ? '#FBF5E8' : t.text }]}>{time}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
  },
});
