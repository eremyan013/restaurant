import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { fetchTerms } from '../lib/api';
import { FONTS } from '../theme';
import { Icon } from '../components/Icon';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Terms'>;

function buildHtml(content: string, isDark: boolean): string {
  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const text = isDark ? '#f0f0f0' : '#1a1a1a';
  const muted = isDark ? '#888888' : '#71717a';
  const border = isDark ? '#333333' : '#e4e4e7';

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${bg};
    color: ${text};
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    padding: 20px 20px 40px;
    -webkit-text-size-adjust: none;
  }
  h1 { font-size: 1.45rem; font-weight: 700; margin: 1.2rem 0 0.5rem; }
  h2 { font-size: 1.2rem; font-weight: 700; margin: 1rem 0 0.4rem; }
  h3 { font-size: 1.05rem; font-weight: 600; margin: 0.85rem 0 0.35rem; }
  p { margin: 0.55rem 0; }
  ul { list-style: disc; padding-left: 1.4rem; margin: 0.55rem 0; }
  ol { list-style: decimal; padding-left: 1.4rem; margin: 0.55rem 0; }
  li { margin: 0.25rem 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  blockquote {
    border-left: 3px solid ${border};
    padding-left: 1rem;
    color: ${muted};
    margin: 0.75rem 0;
  }
  hr { border: none; border-top: 1px solid ${border}; margin: 1rem 0; }
</style>
</head>
<body>${content}</body>
</html>`;
}

export function TermsScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore();
  const { tr, language } = useTranslation();
  const insets = useSafeAreaInsets();

  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTerms(language)
      .then((result) => {
        if (!cancelled) {
          setHtml(result || null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHtml(null);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [language]);

  const isEmptyHtml = !html || html === '<p></p>' || html.trim() === '';

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
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={t.primary} size="large" />
          <Text style={[styles.hint, { color: t.textMute }]}>{tr('terms_loading')}</Text>
        </View>
      ) : isEmptyHtml ? (
        <View style={styles.centre}>
          <Text style={[styles.hint, { color: t.textMute }]}>{tr('terms_empty')}</Text>
        </View>
      ) : (
        <WebView
          source={{ html: buildHtml(html!, t.dark ?? false) }}
          style={[styles.webview, { backgroundColor: t.bg }]}
          scrollEnabled
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          contentInset={{ bottom: insets.bottom + 20 }}
        />
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
  webview: {
    flex: 1,
  },
});
