import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme, SHADOWS, FONTS} from '../theme';
import { VenueRow } from '../lib/database.types';
import { Icon } from './Icon';
import { Stars } from './Stars';
import { TimePill } from './TimePill';
import { HeatDot } from './HeatDot';
import { useTranslation } from '../hooks/useTranslation';

interface HeroCardProps {
  venue: VenueRow;
  t: Theme;
  onOpen: () => void;
  onFav: () => void;
  isFav: boolean;
  onBook?: () => void;
}

export function HeroCard({ venue, t, onOpen, onFav, isFav, onBook }: HeroCardProps) {
  const { tr } = useTranslation();
  return (
    <Pressable
      onPress={onOpen}
      style={[
        styles.card,
        {
          backgroundColor: t.surface,
          borderColor: t.border,
        },
        SHADOWS.card,
      ]}
    >
      <View style={styles.imageWrap}>
        <Image source={{ uri: venue.photo_url }} style={styles.image} />
        {venue.booked_today >= 10 && (
          <View style={styles.bookedBadge}>
            <HeatDot level={venue.heat} t={t} size={6} />
            <Text style={styles.bookedText}>{venue.booked_today} {tr('card_booked_short')}</Text>
          </View>
        )}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFav();
          }}
          hitSlop={8}
          style={styles.favBtn}
        >
          <Icon name={isFav ? 'heartFill' : 'heart'} size={17} color={isFav ? t.pop : t.text} />
        </Pressable>
      </View>
      <View style={styles.body}>
        <Text style={[styles.meta, { color: t.textMute }]}>
          {venue.price} · {venue.cuisine} · {venue.area}
        </Text>
        <Text style={[styles.name, { color: t.text }]}>{venue.name}</Text>
        <Stars rating={venue.rating} reviews={venue.reviews_count} t={t} />
        <View style={styles.timeRow}>
          {venue.times.slice(0, 3).map((time) => (
            <TimePill key={time} time={time} t={t} size="sm" />
          ))}
        </View>
        <Text style={[styles.perk, { color: t.accent }]}>+{venue.perk}</Text>
        {onBook && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBook();
            }}
            style={[styles.bookBtn, { backgroundColor: t.primary }]}
          >
            <Text style={[styles.bookBtnText, { color: '#FBF5E8' }]}>{tr('conc_book_now')}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 280,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    flexShrink: 0,
  },
  imageWrap: {
    height: 168,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  bookedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  bookedText: {
    color: '#fff',
    fontSize: 11.5,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  favBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 14,
    paddingBottom: 16,
    gap: 4,
  },
  meta: {
    fontSize: 11.5,
    fontFamily: FONTS.medium, fontWeight: '500',
    marginBottom: 2,
  },
  name: {
    fontSize: 17,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  perk: {
    fontSize: 10.5,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: 4,
  },
  bookBtn: {
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  bookBtnText: {
    fontSize: 13,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
