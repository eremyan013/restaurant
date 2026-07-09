import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { supabase } from '../lib/supabase';
import { sendPhoneOtp, verifyPhoneOtp } from '../lib/api';
import { Icon } from '../components/Icon';
import { FONTS, COLORS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PhoneVerify'>;
  route: { params: { phone: string; userId: string } };
};

const CODE_LENGTH = 6;
const RESEND_DELAY = 60;

function maskPhone(phone: string): string {
  // +37412345678 → +374 ** *** 678
  if (phone.length < 5) return phone;
  const prefix = phone.slice(0, 4);   // +374
  const last3  = phone.slice(-3);
  const stars  = '*'.repeat(Math.max(0, phone.length - 7));
  return `${prefix} ${stars} ${last3}`;
}

export function PhoneVerifyScreen({ navigation, route }: Props) {
  const { phone, userId } = route.params;
  const { theme: t } = useStore();
  const { tr } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const BOX_GAP = 8;
  const BOX_WIDTH = Math.min(48, Math.floor((screenWidth - 48 - BOX_GAP * 5) / 6));
  const { setPendingPhoneVerification } = useStore();
  const insets = useSafeAreaInsets();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_DELAY);

  const inputRefs = useRef<Array<TextInput | null>>(Array(CODE_LENGTH).fill(null));
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-send OTP on mount
  useEffect(() => {
    doSend();
    return () => { if (timerRef.current) clearInterval(timerRef.current) };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_DELAY);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function doSend() {
    setSendLoading(true);
    setError(null);
    try {
      await sendPhoneOtp(userId, phone);
      startCooldown();
    } catch {
      setError(tr('otp_err_send'));
    } finally {
      setSendLoading(false);
    }
  }

  function handleDigitChange(index: number, text: string) {
    // Handle paste: if >1 character lands in a box
    if (text.length > 1) {
      const pasted = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
      if (pasted.length > 0) {
        const newDigits = Array(CODE_LENGTH).fill('');
        for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i]!;
        setDigits(newDigits);
        const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
        inputRefs.current[focusIdx]?.focus();
        if (pasted.length === CODE_LENGTH) {
          submitCode(newDigits);
        }
      }
      return;
    }

    const digit = text.replace(/\D/g, '');
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
    if (digit && index === CODE_LENGTH - 1) {
      // Last box filled — auto submit
      submitCode(newDigits);
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }

  const submitCode = useCallback(async (codeDigits: string[]) => {
    const code = codeDigits.join('');
    if (code.length < CODE_LENGTH) {
      setError(tr('otp_err_invalid'));
      return;
    }
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    try {
      const result = await verifyPhoneOtp(userId, phone, code);
      if ('success' in result && result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setPendingPhoneVerification(false);
        // AppNavigator will automatically switch to authenticated stack
      } else {
        const errKey = 'error' in result
          ? (result.error === 'expired' ? 'otp_err_expired' : result.error === 'invalid_code' ? 'otp_err_invalid' : 'otp_err_generic')
          : 'otp_err_generic';
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(tr(errKey));
        // Clear the digit boxes on wrong code
        setDigits(Array(CODE_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } catch {
      setError(tr('otp_err_generic'));
    } finally {
      setLoading(false);
    }
  }, [userId, phone, tr, setPendingPhoneVerification]);

  async function handleCancel() {
    Alert.alert(
      tr('otp_cancel'),
      tr('otp_cancel_confirm'),
      [
        { text: tr('no'), style: 'cancel' },
        {
          text: tr('yes'),
          style: 'destructive',
          onPress: async () => {
            await (supabase as any).auth.signOut();
            setPendingPhoneVerification(false);
          },
        },
      ]
    );
  }

  const code = digits.join('');
  const isComplete = code.length === CODE_LENGTH;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={[t.primaryDeep, t.primary]}
        style={[styles.brandStrip, { paddingTop: insets.top + 20 }]}
      >
        <View style={styles.brandOrb} />
        <Pressable onPress={handleCancel} style={styles.backBtn} hitSlop={12}>
          <Icon name="chevL" size={22} color="rgba(251,245,232,0.7)" />
        </Pressable>
        <Text style={styles.brandTitle}>Tonir</Text>
        <Text style={styles.brandSub}>{tr('otp_title')}</Text>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
          {/* Description */}
          <View style={styles.descBlock}>
            <Text style={[styles.descTitle, { color: t.text }]}>{tr('otp_enter_hint')}</Text>
            <Text style={[styles.descSub, { color: t.textMute }]}>
              {tr('otp_sent_to').replace('{phone}', maskPhone(phone))}
            </Text>
          </View>

          {/* Digit boxes */}
          <View style={[styles.boxRow, { columnGap: BOX_GAP }]}>
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                value={digit}
                onChangeText={text => handleDigitChange(i, text)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}   // allows paste of all digits
                selectTextOnFocus
                style={[
                  styles.digitBox,
                  {
                    width: BOX_WIDTH,
                    backgroundColor: t.surface,
                    borderColor: digit ? t.primary : t.border,
                    color: t.text,
                  },
                  error ? { borderColor: COLORS.danger } : undefined,
                ]}
                caretHidden
              />
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: `${COLORS.danger}20`, borderColor: `${COLORS.danger}40` }]}>
              <Icon name="x" size={14} color={COLORS.danger} strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <Pressable
            onPress={() => submitCode(digits)}
            disabled={loading || !isComplete}
            style={[
              styles.submitBtn,
              { backgroundColor: t.primary, opacity: (loading || !isComplete) ? 0.5 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.cream} />
            ) : (
              <>
                <Text style={styles.submitText}>{tr('otp_submit')}</Text>
                <Icon name="arrow" size={18} color={COLORS.cream} strokeWidth={2} />
              </>
            )}
          </Pressable>

          {/* Resend */}
          <View style={styles.resendRow}>
            {sendLoading ? (
              <ActivityIndicator size="small" color={t.primary} />
            ) : cooldown > 0 ? (
              <Text style={[styles.resendText, { color: t.textMute }]}>
                {tr('otp_resend_in').replace('{s}', String(cooldown))}
              </Text>
            ) : (
              <Pressable onPress={doSend} hitSlop={8}>
                <Text style={[styles.resendText, { color: t.primary }]}>{tr('otp_resend')}</Text>
              </Pressable>
            )}
          </View>
        </View>
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
    color: COLORS.cream,
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
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    gap: 20,
  },
  descBlock: {
    alignItems: 'center',
    gap: 6,
  },
  descTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.3,
  },
  descSub: {
    fontSize: 14,
    textAlign: 'center',
  },
  boxRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  digitBox: {
    width: 48,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 24,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  errorText: { color: COLORS.danger, fontSize: 13, flex: 1 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  submitText: { color: COLORS.cream, fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  resendRow: {
    alignItems: 'center',
    minHeight: 24,
  },
  resendText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
});
