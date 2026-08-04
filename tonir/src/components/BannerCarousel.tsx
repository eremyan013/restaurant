import React, { useEffect, useCallback, useRef } from 'react';
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
const PAGE_W = Dimensions.get('window').width - 24;

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  banners: BannerRow[];
  navigation: Nav;
}

export function BannerCarousel({ banners, navigation }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const offsetRef = useRef(0);

  const n = banners.length;
  // Infinite-loop list: [last, ...real, first]
  const items = n > 1 ? [banners[n - 1]!, ...banners, banners[0]!] : banners;

  function jumpTo(x: number, animated = false) {
    scrollRef.current?.scrollTo({ x, animated });
    offsetRef.current = x;
  }

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (n <= 1) return;
    timerRef.current = setInterval(() => {
      const next = offsetRef.current + PAGE_W;
      scrollRef.current?.scrollTo({ x: next, animated: true });
      offsetRef.current = next;
      // If we've landed on the cloned first, silently reset to the real first
      if (next >= (n + 1) * PAGE_W) {
        setTimeout(() => jumpTo(PAGE_W), 350);
      }
    }, ROTATE_INTERVAL_MS);
  }

  // Init scroll position and timer when banner count changes
  useEffect(() => {
    jumpTo(n > 1 ? PAGE_W : 0);
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // Reset to first item when the banners array itself is replaced
  useEffect(() => {
    jumpTo(n > 1 ? PAGE_W : 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banners]);

  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (n <= 1) return;
    const x = e.nativeEvent.contentOffset.x;

    if (x <= 0) {
      // Swiped back past the cloned last → jump to real last
      jumpTo(n * PAGE_W);
    } else if (x >= (n + 1) * PAGE_W) {
      // Swiped forward past the cloned first → jump to real first
      jumpTo(PAGE_W);
    } else {
      offsetRef.current = x;
    }

    startTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

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

  if (n === 0) return null;

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
        {items.map((banner, i) => (
          <Pressable
            key={i}
            onPress={() => handleTap(banner)}
            disabled={banner.tap_action === 'none'}
            style={styles.page}
          >
            <Image source={{ uri: banner.image_url }} style={styles.image} resizeMode="cover" />
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    borderRadius: 18,
    overflow: 'hidden',
    height: 176,
  },
  scroll: {
    flex: 1,
  },
  page: {
    width: PAGE_W,
    height: 176,
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
});
