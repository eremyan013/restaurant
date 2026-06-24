import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, Image,
  Animated, Platform, StatusBar, PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ONBOARDING_KEY } from '../navigation';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { PHOTOS } from '../lib/photos';
import { FONTS } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'> };

const STEP_PHOTOS = [PHOTOS.diningArmen, PHOTOS.diningChic, PHOTOS.diningWarm];

export function OnboardingScreen({ navigation }: Props) {
  const { theme: t } = useStore();
  const { tr } = useTranslation();
  const [step, setStep] = useState(0);

  const STEPS = [
    {
      photo: STEP_PHOTOS[0],
      title: tr('onb_step0_title'),
      subtitle: tr('onb_step0_sub'),
      cta: tr('onb_step0_cta'),
    },
    {
      photo: STEP_PHOTOS[1],
      title: tr('onb_step1_title'),
      subtitle: tr('onb_step1_sub'),
      cta: tr('onb_step1_cta'),
    },
    {
      photo: STEP_PHOTOS[2],
      title: tr('onb_step2_title'),
      subtitle: tr('onb_step2_sub'),
      cta: tr('onb_step2_cta'),
      secondaryCta: tr('onb_step2_cta2'),
    },
  ];

  const dotWidths = useRef(STEPS.map((_, i) => new Animated.Value(i === 0 ? 20 : 6))).current;

  useEffect(() => {
    STEPS.forEach((_, i) => {
      Animated.timing(dotWidths[i], {
        toValue: i === step ? 20 : 6,
        duration: 250,
        useNativeDriver: false,
      }).start();
    });
  }, [step]);

  const current = STEPS[step];

  const insets = useSafeAreaInsets();

  const nextRef = useRef(next);
  useEffect(() => { nextRef.current = next; }, [step]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) nextRef.current();
      },
    })
  ).current;

  async function goToAuth() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    navigation.navigate('Auth');
  }

  function next() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      goToAuth();
    }
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <StatusBar barStyle="light-content" />
      <Image source={{ uri: current.photo }} style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.85]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={[styles.brandMark, { backgroundColor: t.accent }]}>
          <Icon name="tonir" size={18} color={t.primaryDeep} strokeWidth={2} />
        </View>
        <View
          style={styles.dots}
          accessible={true}
          accessibilityRole="progressbar"
          accessibilityLabel={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? '#FBF5E8' : 'rgba(251,245,232,0.35)',
                  width: dotWidths[i],
                },
              ]}
            />
          ))}
        </View>
        {step < STEPS.length - 1 && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goToAuth();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={tr('onb_skip')}
          >
            <Text style={styles.skip}>{tr('onb_skip')}</Text>
          </Pressable>
        )}
      </View>

      {/* Bottom content */}
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text style={styles.title} accessibilityRole="header">{current.title}</Text>
        <Text style={styles.subtitle}>{current.subtitle}</Text>

        <Pressable
          onPress={next}
          style={styles.ctaBtn}
          accessibilityRole="button"
          accessibilityLabel={current.cta}
        >
          <Text style={[styles.ctaText, { color: t.primaryDeep }]}>{current.cta}</Text>
        </Pressable>

        {current.secondaryCta && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goToAuth();
            }}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel={current.secondaryCta}
          >
            <Text style={styles.secondaryText}>{current.secondaryCta}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#14352A',
  },
  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  skip: {
    color: 'rgba(251,245,232,0.7)',
    fontSize: 14,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 28,
    gap: 16,
  },
  title: {
    fontSize: 34,
    fontFamily: FONTS.extraBold, fontWeight: '800',
    color: '#FBF5E8',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 14.5,
    color: 'rgba(251,245,232,0.85)',
    lineHeight: 22,
    marginBottom: 8,
  },
  ctaBtn: {
    backgroundColor: '#FBF5E8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    color: 'rgba(251,245,232,0.75)',
    fontSize: 14,
    fontFamily: FONTS.medium, fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
