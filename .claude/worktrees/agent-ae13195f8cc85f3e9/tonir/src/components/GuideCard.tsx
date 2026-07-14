import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme, FONTS} from '../theme';
import { GuideRow } from '../lib/database.types';
import { Icon } from './Icon';

interface GuideCardProps {
  guide: GuideRow;
  t: Theme;
  onOpen: () => void;
  width?: number;
}

export function GuideCard({ guide, t, onOpen, width = 200 }: GuideCardProps) {
  return (
    <Pressable onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpen(); }} style={[styles.card, { width }]}>
      <Image source={{ uri: guide.cover_url }} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        locations={[0.35, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.top}>
        <View style={styles.tag}>
          <Icon name="spark" size={11} color="#FBF5E8" strokeWidth={2} />
          <Text style={styles.tagText}>{guide.tag}</Text>
        </View>
        <View style={styles.arrowBtn}>
          <Icon name="arrowUR" size={14} color={t.primaryDeep} strokeWidth={2} />
        </View>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.subtitle}>{guide.subtitle}</Text>
        <Text style={styles.title}>{guide.title}</Text>
        <Text style={styles.count}>{guide.count} վայր</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 240,
    borderRadius: 18,
    overflow: 'hidden',
    flexShrink: 0,
  },
  top: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  tagText: {
    color: '#FBF5E8',
    fontSize: 10,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
  },
  subtitle: {
    color: '#FBF5E8',
    fontSize: 11,
    opacity: 0.85,
    marginBottom: 3,
  },
  title: {
    color: '#FBF5E8',
    fontSize: 18,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  count: {
    color: '#FBF5E8',
    fontSize: 10.5,
    opacity: 0.75,
    marginTop: 4,
    letterSpacing: 0.4,
  },
});
