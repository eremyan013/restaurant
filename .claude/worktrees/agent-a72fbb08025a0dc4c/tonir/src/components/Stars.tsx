import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme, FONTS} from '../theme';
import { Icon } from './Icon';

interface StarsProps {
  rating: number;
  reviews?: number;
  t: Theme;
  size?: number;
  compact?: boolean;
}

export function Stars({ rating, reviews, t, size = 12, compact = false }: StarsProps) {
  return (
    <View style={styles.row}>
      <Icon name="star" size={size} color={t.accent} />
      <Text style={[styles.rating, { fontSize: size + 1, color: t.text }]}>
        {rating}
      </Text>
      {!compact && reviews != null && (
        <Text style={[styles.reviews, { fontSize: size, color: t.textMute }]}>
          ({reviews.toLocaleString()})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  reviews: {
    marginLeft: 2,
  },
});
