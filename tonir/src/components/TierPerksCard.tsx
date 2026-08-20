import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { fetchTierPerks } from '../lib/api';
import { TierPerkRow } from '../lib/database.types';
import { Icon } from './Icon';
import { useTranslation } from '../hooks/useTranslation';
import { FONTS } from '../theme';
import { TIER_COUNT } from '../lib/constants';

type Props = {
  currentTierLevel: number;
  theme: any; // the theme object (t) from ProfileScreen — intentional; Theme type is project-internal
};

export function TierPerksCard({ currentTierLevel, theme: t }: Props) {
  const { tr, language } = useTranslation();

  const [perks, setPerks] = useState<TierPerkRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTierPerks()
      .then(setPerks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getLabel(perk: TierPerkRow): string {
    if (language === 'hy') return perk.label_hy;
    if (language === 'ru') return perk.label_ru;
    return perk.label_en;
  }

  const currentPerks = perks.filter((p) => p.tier_level === currentTierLevel);
  const nextPerks    = perks.filter((p) => p.tier_level === currentTierLevel + 1);

  // Render nothing silently if there are no perks at all (table not seeded yet)
  if (!loading && perks.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Text style={[styles.title, { color: t.text }]}>{tr('prof_perks_title')}</Text>

      {loading ? (
        <ActivityIndicator color={t.primary} style={{ marginVertical: 12 }} />
      ) : (
        <>
          {currentPerks.map((perk) => (
            <View key={perk.id} style={styles.row}>
              {perk.icon_name ? (
                <Icon
                  name={perk.icon_name as any /* icon_name comes from DB; Icon returns null for unknown names */}
                  size={16}
                  color={t.primary}
                  strokeWidth={1.8}
                />
              ) : (
                <View style={styles.iconPlaceholder} />
              )}
              <Text style={[styles.label, { color: t.text }]}>{getLabel(perk)}</Text>
            </View>
          ))}

          {currentTierLevel < TIER_COUNT && nextPerks.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: t.border }]} />
              <Text style={[styles.nextTitle, { color: t.textMute }]}>
                {tr('prof_perks_next_title')}
              </Text>
              {nextPerks.map((perk) => (
                <View key={perk.id} style={styles.row}>
                  {perk.icon_name ? (
                    <Icon
                      name={perk.icon_name as any /* icon_name comes from DB; Icon returns null for unknown names */}
                      size={16}
                      color={t.textMute}
                      strokeWidth={1.8}
                    />
                  ) : (
                    <View style={styles.iconPlaceholder} />
                  )}
                  <Text style={[styles.label, { color: t.textMute }]}>{getLabel(perk)}</Text>
                </View>
              ))}
            </>
          )}

          {currentTierLevel >= TIER_COUNT && (
            <Text style={[styles.maxTier, { color: t.primary }]}>
              {tr('prof_perks_max_tier')}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconPlaceholder: {
    width: 16,
    height: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  nextTitle: {
    fontSize: 11,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  maxTier: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    fontWeight: '500',
  },
});
