import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { fetchTerms } from '../lib/api';
import { FONTS } from '../theme';
import { Icon } from '../components/Icon';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Terms'>;

export function TermsScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore();
  const { tr, language } = useTranslation();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTerms(language)
      .then((result) => {
        if (!cancelled) {
          setText(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setText('');
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [language]);

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + (Platform.OS === 'android' ? 12 : 8),
            backgroundColor: t.bg,
            borderBottomColor: t.border,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Icon name="chevL" size={22} color={t.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>{tr('terms_title')}</Text>
        {/* Spacer to visually centre the title */}
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={t.primary} size="large" />
          <Text style={[styles.hint, { color: t.textMute }]}>{tr('terms_loading')}</Text>
        </View>
      ) : !text ? (
        <View style={styles.centre}>
          <Text style={[styles.hint, { color: t.textMute }]}>{tr('terms_empty')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.bodyText, { color: t.text }]}>{text}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  hint: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  bodyText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    lineHeight: 24,
  },
});
