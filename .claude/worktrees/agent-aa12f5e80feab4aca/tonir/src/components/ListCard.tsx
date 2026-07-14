import React from 'react';
import { View, Text, Image, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Theme, FONTS} from '../theme';
import { VenueRow } from '../lib/database.types';
import { Icon } from './Icon';
import { Stars } from './Stars';
import { TimePill } from './TimePill';
import { HeatDot } from './HeatDot';
import { useTranslation } from '../hooks/useTranslation';

interface ListCardProps {
  venue: VenueRow;
  t: Theme;
  onOpen: () => void;
  onFav: () => void;
  isFav: boolean;
}

export function ListCard({ venue, t, onOpen, onFav, isFav }: ListCardProps) {
  const { tr } = useTranslation();
  return (
    <Pressable
      onPress={onOpen}
      style={[styles.card, { borderBottomColor: t.border }]}
    >
      <View style={styles.top}>
        <Image source={{ uri: venue.photo_url }} style={styles.image} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <View style={styles.nameBlock}>
              <Text style={[styles.name, { color: t.text }]}>{venue.name}</Text>
              <Text style={[styles.meta, { color: t.textMute }]}>
                {venue.price} · {venue.cuisine}
              </Text>
              <View style={styles.metaRow}>
                <Stars rating={venue.rating} reviews={venue.reviews_count} t={t} compact size={11} />
                <Text style={{ color: t.textMute, fontSize: 11 }}>·</Text>
                <View style={styles.dist}>
                  <Icon name="pin" size={11} color={t.textMute} />
                  <Text style={[styles.distText, { color: t.textMute }]}>{venue.distance_km}</Text>
                </View>
              </View>
            </View>
            <Pressable onPress={onFav} hitSlop={8} style={styles.favBtn}>
              <Icon name={isFav ? 'heartFill' : 'heart'} size={18} color={isFav ? t.pop : t.textMute} />
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeRow}>
        {venue.times.slice(0, 5).map((time) => (
          <View key={time} style={{ marginRight: 6 }}>
            <TimePill time={time} t={t} size="sm" />
          </View>
        ))}
      </ScrollView>
      <View style={styles.heatRow}>
        <HeatDot level={venue.heat} t={t} withLabel size={6} />
        <Text style={{ color: t.textMute, fontSize: 11 }}>·</Text>
        <Text style={[styles.bookedText, { color: t.textMute }]}>
          <Text style={{ color: t.text, fontFamily: FONTS.bold, fontWeight: '700' }}>{venue.booked_today}</Text>{' '}
          {tr('card_booked_today')}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  top: {
    flexDirection: 'row',
    gap: 14,
  },
  image: {
    width: 88,
    height: 88,
    borderRadius: 14,
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  name: {
    fontSize: 16,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
  },
  meta: {
    fontSize: 11.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  distText: {
    fontSize: 11,
  },
  favBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  timeRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  heatRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookedText: {
    fontSize: 11,
  },
});
