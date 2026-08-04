import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, Image, StyleSheet, Linking,
  ScrollView, Dimensions, NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { FONTS } from '../theme';
import type { BannerRow } from '../lib/database.types';
import type { RootStackParamList, TabParamList } from '../navigation';

const ROTATE_INTERVAL_MS = 4000;
const PAGE_W = Dimensions.get('window').width - 40; // matches marginHorizontal: 20 * 2

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  banners: BannerRow[];
  navigation: Nav;
}

export function BannerCarousel({ banners, navigation }: Props) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % banners.length;
        scrollRef.current?.scrollTo({ x: next * PAGE_W, animated: true });
        return next;
      });
    }, ROTATE_INTERVAL_MS);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  useEffect(() => {
    setIndex(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [banners]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / PAGE_W);
    setIndex(newIndex);
    startTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners.length]);

  const handleTap = useCallback((banner: BannerRow) => {
    if (banner.tap_action === 'external_url' && banner.tap_url) {
      Linking.openURL(banner.tap_url);
      return;
    }
    if (banner.tap_action === 'deep_link' && banner.tap_url) {
      const [screen, param] = banner.tap_url.split('/');
      if (screen === 'venue' && param) {
        navigation.navigate('Detail', { venueId: param });
      } else if (screen === 'map') {
        navigation.navigate('Map', {});
      }
    }
  }, [navigation]);

  if (banners.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scroll}
      >
        {banners.map((banner) => {
          const isTappable = banner.tap_action !== 'none';
          return (
            <Pressable
              key={banner.id}
              onPress={() => handleTap(banner)}
              disabled={!isTappable}
              style={styles.page}
            >
              <Image
                source={{ uri: banner.image_url }}
                style={styles.image}
                resizeMode="cover"
              />
              {(banner.title || banner.subtitle) && (
                <View style={styles.overlay}>
                  {banner.title && (
                    <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
                  )}
                  {banner.subtitle && (
                    <Text style={styles.subtitle} numberOfLines={2}>{banner.subtitle}</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    height: 88,
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: PAGE_W,
    height: 88,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'flex-end',
    padding: 12,
  },
  title: {
    color: '#fff',
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11.5,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  dots: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    backgroundColor: '#fff',
  },
});
