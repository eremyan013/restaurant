import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Theme, heatColor, HeatLevel, FONTS} from '../theme';
import { useTranslation } from '../hooks/useTranslation';

interface HeatDotProps {
  level: HeatLevel;
  t: Theme;
  withLabel?: boolean;
  size?: number;
}

export function HeatDot({ level, t, withLabel = false, size = 8 }: HeatDotProps) {
  const { tr } = useTranslation();
  const color = heatColor(level, t);
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (level !== 'high') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.8, duration: 800, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [level, scale]);

  const label =
    level === 'high' ? tr('heat_high')
    : level === 'med' ? tr('heat_med')
    : tr('heat_low');

  return (
    <View style={styles.row}>
      <View style={{ width: size + 8, height: size + 8, alignItems: 'center', justifyContent: 'center' }}>
        {level === 'high' && (
          <Animated.View
            style={[
              styles.halo,
              {
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: 0.25,
                transform: [{ scale }],
              },
            ]}
          />
        )}
        <View
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {withLabel && (
        <Text style={[styles.label, { color: t.textMute }]}>{label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    position: 'absolute',
  },
  halo: {
    position: 'absolute',
  },
  label: {
    fontSize: 11.5,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
});
