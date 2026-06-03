import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

export function AuthScreen({ navigation }: Props) {
  const { theme: t } = useStore();
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInfo = error === tr('auth_err_confirm');

  function switchMode(next: 'signin' | 'signup') {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(next);
    setError(null);
  }

  async function submit() {
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError(tr('auth_err_fields'));
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError(tr('auth_err_name'));
      return;
    }
    if (password.length < 6) {
      setError(tr('auth_err_pass_short'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error: err } = await (supabase as any).auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (err) throw err;
        // If email confirmation is required, session will be null
        if (!data?.session) {
          setError(tr('auth_err_confirm'));
          setLoading(false);
          return;
        }
        // Create profile row for new user
        await (supabase as any).from('profiles').upsert({
          id: data.session.user.id,
          name: name.trim(),
          email: email.trim(),
        }, { onConflict: 'id' });
        // onAuthStateChange handles navigation
      } else {
        // Auto-detect: all digits = player ID, otherwise email
        let loginEmail = email.trim();
        if (/^\d+$/.test(loginEmail)) {
          const { data: resolved } = await (supabase as any).rpc('get_email_by_player_id', { p_id: parseInt(loginEmail, 10) });
          if (!resolved) { setError(tr('auth_err_id_not_found')); setLoading(false); return; }
          loginEmail = resolved;
        }
        const { data, error: err } = await (supabase as any).auth.signInWithPassword({ email: loginEmail, password });
        if (err) throw err;
        // Block admin accounts from logging into the mobile app
        if (data?.user) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
          if (profile?.role === 'admin' || profile?.role === 'super_admin') {
            await (supabase as any).auth.signOut();
            setError(tr('auth_err_admin'));
            setLoading(false);
            return;
          }
        }
        // onAuthStateChange in AppNavigator handles navigation
      }
    } catch (err: any) {
      const msg = err?.message ?? tr('auth_err_generic');
      if (msg.includes('Invalid login credentials')) {
        setError(tr('auth_err_invalid'));
      } else if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError(tr('auth_err_exists'));
      } else if (msg.includes('Email not confirmed')) {
        setError(tr('auth_err_not_confirmed'));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Top brand strip */}
      <LinearGradient
        colors={[t.primaryDeep, t.primary]}
        style={[styles.brandStrip, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.brandOrb} />
        <Pressable
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Icon name="chevL" size={22} color="rgba(251,245,232,0.7)" />
        </Pressable>
        <Text style={styles.brandTitle}>Tonir</Text>
        <Text style={styles.brandSub}>{tr('auth_brand_sub')}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Mode toggle */}
          <View style={[styles.toggle, { backgroundColor: `${t.primary}14` }]}>
            <Pressable
              onPress={() => switchMode('signin')}
              style={[styles.toggleBtn, mode === 'signin' && [styles.toggleBtnActive, { backgroundColor: t.primary }]]}
            >
              <Text style={[styles.toggleText, { color: mode === 'signin' ? '#FBF5E8' : t.text }]}>
                {tr('auth_signin')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => switchMode('signup')}
              style={[styles.toggleBtn, mode === 'signup' && [styles.toggleBtnActive, { backgroundColor: t.primary }]]}
            >
              <Text style={[styles.toggleText, { color: mode === 'signup' ? '#FBF5E8' : t.text }]}>
                {tr('auth_signup')}
              </Text>
            </Pressable>
          </View>

          {/* Fields */}
          <View style={styles.fields}>
            {mode === 'signup' && (
              <View style={[styles.inputWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Icon name="user" size={16} color={t.textMute} strokeWidth={1.75} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={tr('auth_name_placeholder')}
                  placeholderTextColor={t.textFaint}
                  autoCapitalize="words"
                  style={[styles.input, { color: t.text }]}
                />
              </View>
            )}

            <View style={[styles.inputWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Icon name="mail" size={16} color={t.textMute} strokeWidth={1.75} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder={mode === 'signin' ? tr('auth_email_or_id_placeholder') : tr('auth_email_placeholder')}
                placeholderTextColor={t.textFaint}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={[styles.input, { color: t.text }]}
              />
            </View>

            <View style={[styles.inputWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Icon name="lock" size={16} color={t.textMute} strokeWidth={1.75} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder={tr('auth_pass_placeholder')}
                placeholderTextColor={t.textFaint}
                secureTextEntry
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                style={[styles.input, { color: t.text }]}
              />
            </View>
          </View>

          {/* Error */}
          {error && (
            <View style={[
              styles.errorBox,
              isInfo
                ? { backgroundColor: '#1F4D3E20', borderColor: '#1F4D3E40' }
                : { backgroundColor: '#9B233520', borderColor: '#9B233540' },
            ]}>
              <Icon name={isInfo ? 'check' : 'x'} size={14} color={isInfo ? '#1F4D3E' : '#9B2335'} strokeWidth={2} />
              <Text style={[styles.errorText, isInfo && { color: '#1F4D3E' }]}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              submit();
            }}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: t.primary, opacity: loading ? 0.7 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FBF5E8" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {mode === 'signin' ? tr('auth_submit_signin') : tr('auth_submit_signup')}
                </Text>
                <Icon name="arrow" size={18} color="#FBF5E8" strokeWidth={2} />
              </>
            )}
          </Pressable>

          {/* Switch mode hint */}
          <Text style={[styles.switchHint, { color: t.textMute }]}>
            {mode === 'signin' ? tr('auth_hint_signin') : tr('auth_hint_signup')}
            <Text
              onPress={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              style={{ color: t.primary, fontFamily: FONTS.semiBold, fontWeight: '600' }}
            >
              {mode === 'signin' ? tr('auth_switch_to_signup') : tr('auth_switch_to_signin')}
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  brandStrip: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    overflow: 'hidden',
    alignItems: 'center',
  },
  brandOrb: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(201,169,97,0.12)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 52,
  },
  brandTitle: {
    color: '#FBF5E8',
    fontSize: 32,
    fontFamily: FONTS.extraBold, fontWeight: '800',
    letterSpacing: -0.8,
    marginBottom: 4,
  },
  brandSub: {
    color: 'rgba(251,245,232,0.6)',
    fontSize: 13,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 16,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleBtnActive: {},
  toggleText: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  fields: { gap: 12 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { color: '#9B2335', fontSize: 13, flex: 1 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 4,
  },
  submitText: { color: '#FBF5E8', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  switchHint: { textAlign: 'center', fontSize: 13, marginTop: 4 },
});
