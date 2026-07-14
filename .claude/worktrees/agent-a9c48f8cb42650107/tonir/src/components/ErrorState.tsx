import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme, FONTS} from '../theme';
import { Icon } from './Icon';
import { useTranslation } from '../hooks/useTranslation';

interface ErrorStateProps {
  t: Theme;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ t, message, onRetry }: ErrorStateProps) {
  const { tr } = useTranslation();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconCircle, { backgroundColor: `${t.primary}12` }]}>
        <Icon name="x" size={28} color={t.textMute} strokeWidth={1.75} />
      </View>
      <Text style={[styles.title, { color: t.text }]}>{tr('err_title')}</Text>
      <Text style={[styles.sub, { color: t.textMute }]}>
        {message ?? tr('err_sub')}
      </Text>
      {onRetry && (
        <Pressable
          onPress={() => { if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); onRetry!(); }}
          style={[styles.retryBtn, { backgroundColor: t.primary }]}
        >
          <Text style={styles.retryText}>{tr('err_retry')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingBottom: 60,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 999,
  },
  retryText: {
    color: '#FBF5E8',
    fontSize: 14,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
});
