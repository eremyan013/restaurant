import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  StatusBar, KeyboardAvoidingView, Platform, Animated, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useVenues } from '../hooks/useVenues';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { HeroCard } from '../components/HeroCard';
import { FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Concierge'>;
};

interface Message {
  id: string;
  role: 'user' | 'concierge';
  text: string;
  suggestions?: string[];
}

interface ReplyRule {
  keywords: string[];
  textKey: string;
  suggestions: string[];
}

const REPLY_RULES: ReplyRule[] = [
  {
    keywords: ['ռոմ', 'rom', 'романт', 'свидан', 'couple', 'date', 'սիր'],
    textKey: 'conc_reply_romantic',
    suggestions: ['kond-house', 'dolmama', 'in-vino'],
  },
  {
    keywords: ['խմ', 'group', 'ընկ', 'друз', 'family', 'ընտ', 'birthday', 'ծնունդ', 'компания'],
    textKey: 'conc_reply_group',
    suggestions: ['lavash', 'pandok', 'tumanyan-khinkali'],
  },
  {
    keywords: ['գին', 'wine', 'вин', 'сом'],
    textKey: 'conc_reply_wine',
    suggestions: ['wine-republic', 'in-vino', 'dolmama'],
  },
  {
    keywords: ['բար', 'bar', 'club', 'dj', 'night', 'ուշ', 'lounge', 'ночн', 'клуб'],
    textKey: 'conc_reply_bar',
    suggestions: ['theater-bar', 'calumet', 'club-aurora'],
  },
  {
    keywords: ['հայ', 'hay', 'armen', 'traditional', 'ավանդ', 'khorovats', 'армян', 'традиц'],
    textKey: 'conc_reply_armenian',
    suggestions: ['dolmama', 'sherep', 'lavash'],
  },
  {
    keywords: ['budget', 'cheap', 'afford', 'бюдж', 'недорог', 'մատч', 'арж'],
    textKey: 'conc_reply_budget',
    suggestions: ['lavash', 'anteb', 'tumanyan-khinkali'],
  },
  {
    keywords: ['brunch', 'breakfast', 'aravot', 'cafe', 'кафе', 'завтр', 'бранч', 'սրճ'],
    textKey: 'conc_reply_brunch',
    suggestions: ['mirzoyan', 'cascade-cafe', 'anteb'],
  },
  {
    keywords: ['patio', 'terrace', 'outdoor', 'բաց', 'террас', 'двор', 'летн'],
    textKey: 'conc_reply_outdoor',
    suggestions: ['dolmama', 'cascade-cafe', 'mirzoyan'],
  },
  {
    keywords: ['georgian', 'վրաց', 'грузин', 'khinkali', 'khachapuri', 'хинкал', 'хачапур', 'խինկ', 'խաչ'],
    textKey: 'conc_reply_georgian',
    suggestions: ['tumanyan-khinkali'],
  },
  {
    keywords: ['italian', 'итал', 'իտալ', 'pizza', 'пицц', 'պիցց', 'pasta', 'паст'],
    textKey: 'conc_reply_italian',
    suggestions: ['cascade-cafe'],
  },
];

const CONCIERGE_API = process.env.EXPO_PUBLIC_CONCIERGE_URL?.replace(/\/$/, '');

// Extract party size and time from the conversation history so the
// booking screen can be pre-filled when the user taps "Book now".
function extractBookingHints(history: Message[]): { people?: number; time?: string } {
  const text = history.map((m) => m.text).join(' ').toLowerCase();

  // Party size: "for 2", "table for 4", "2 people", "2 of us", etc.
  const peopleMatch =
    text.match(/(?:for|table\s+for|party\s+of|group\s+of)\s+(\d+)/) ||
    text.match(/(\d+)\s*(?:people|persons|guests|of\s+us|pax)/);
  const people = peopleMatch ? parseInt(peopleMatch[1], 10) : undefined;

  // Time: "8pm", "8:30pm", "20:00", "at 8"
  const timeMatch =
    text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) ||
    text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/) ||
    text.match(/(\d{2}):(\d{2})/);
  let time: string | undefined;
  if (timeMatch) {
    const ampm = timeMatch[3]?.toLowerCase();
    let h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ?? '00';
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) time = `${String(h).padStart(2, '0')}:${m}`;
  }

  return {
    people: people && people >= 1 && people <= 20 ? people : undefined,
    time,
  };
}

function buildReply(input: string, tr: (key: string) => string): { text: string; suggestions: string[] } {
  const q = input.toLowerCase();
  for (const rule of REPLY_RULES) {
    if (rule.keywords.some((kw) => q.includes(kw))) {
      return { text: tr(rule.textKey), suggestions: rule.suggestions };
    }
  }
  return { text: tr('conc_reply_fallback'), suggestions: ['sherep', 'theater-bar', 'dolmama'] };
}

async function askConcierge(
  userText: string,
  history: Message[],
  tr: (key: string) => string,
  userId?: string | null,
  sessionId?: string | null,
): Promise<{ text: string; suggestions: string[]; session_id?: string; offline?: boolean }> {
  if (!CONCIERGE_API) return { ...buildReply(userText, tr), offline: true };
  try {
    const res = await fetch(`${CONCIERGE_API}/api/concierge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: history.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
        ...(userId    ? { user_id:    userId    } : {}),
        ...(sessionId ? { session_id: sessionId } : {}),
      }),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();
    if (typeof data.text === 'string' && Array.isArray(data.suggestions)) return data;
    throw new Error('bad_response');
  } catch {
    return { ...buildReply(userText, tr), offline: true };
  }
}

async function escalateSession(sessionId: string): Promise<void> {
  if (!CONCIERGE_API || !sessionId) return;
  await fetch(`${CONCIERGE_API}/api/concierge/escalate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId }),
  }).catch(() => {});
}

export function ConciergeScreen({ navigation }: Props) {
  const { theme: t, userId } = useStore();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const { venues } = useVenues();
  const { favs, toggleFav } = useFavorites();
  const { tr, tra } = useTranslation();

  const makeInitial = (): Message => ({
    id: 'm1',
    role: 'concierge',
    text: tr('conc_initial'),
    suggestions: ['dolmama', 'sherep', 'theater-bar'],
  });

  const [messages, setMessages] = useState<Message[]>(() => [makeInitial()]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [quickUsed, setQuickUsed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [escalated, setEscalated] = useState(false);
  const [apiOffline, setApiOffline] = useState(false);

  const QUICK_CHIPS = tra('conc_chips');

  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!typing) { dot1.setValue(0.3); dot2.setValue(0.3); dot3.setValue(0.3); return; }
    const makeAnim = (val: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(val, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(val, { toValue: 0.3, duration: 300, useNativeDriver: true }),
        Animated.delay(Math.max(0, 900 - delay)),
      ]));
    const anims = [makeAnim(dot1, 0), makeAnim(dot2, 300), makeAnim(dot3, 600)];
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, [typing]);

  function clearChat() {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessages([makeInitial()]);
    setInput('');
    setQuickUsed(false);
    setSessionId(null);
    setEscalated(false);
    setApiOffline(false);
  }

  async function handleEscalate() {
    if (escalated || !sessionId) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setEscalated(true);
    await escalateSession(sessionId);
    const note: Message = {
      id: `e${Date.now()}`,
      role: 'concierge',
      text: tr('conc_escalated'),
    };
    setMessages((prev) => [...prev, note]);
  }

  async function dispatchMessage(text: string) {
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text };
    const nextHistory: Message[] = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setTyping(true);
    const [matched] = await Promise.all([
      askConcierge(text, nextHistory, tr, userId, sessionId),
      new Promise<void>((r) => setTimeout(r, 800)),
    ]);
    if (matched.session_id && !sessionId) setSessionId(matched.session_id);
    setApiOffline(matched.offline === true);
    setMessages((prev) => [...prev, {
      id: `c${Date.now()}`, role: 'concierge',
      text: matched.text, suggestions: matched.suggestions,
    }]);
    setTyping(false);
  }

  function sendQuick(text: string) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuickUsed(true);
    dispatchMessage(text);
  }

  function send() {
    if (!input.trim() || typing) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    dispatchMessage(input.trim());
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: t.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.primaryDeep, paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="chevL" size={22} color="#FBF5E8" />
        </Pressable>
        <View style={[styles.headerAvatar, { backgroundColor: t.accent }]}>
          <Icon name="sparkle" size={18} color={t.primaryDeep} strokeWidth={2} />
          <View style={styles.onlineDot} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>Tonir Կոնսիerժ</Text>
          <Text style={styles.headerSub}>{tr('conc_sub')}</Text>
        </View>
        {messages.length > 1 && (
          <Pressable onPress={clearChat} hitSlop={12}>
            <Icon name="trash" size={18} color="rgba(251,245,232,0.6)" strokeWidth={1.75} />
          </Pressable>
        )}
      </View>

      {/* Offline banner */}
      {apiOffline && (
        <View style={[styles.offlineBanner, { backgroundColor: `${t.textMute}22` }]}>
          <Text style={[styles.offlineText, { color: t.textMute }]}>
            {tr('conc_offline')}
          </Text>
          <Pressable onPress={() => setApiOffline(false)} hitSlop={8}>
            <Text style={[styles.offlineText, { color: t.textMute }]}>✕</Text>
          </Pressable>
        </View>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.messages, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {!quickUsed && messages.length === 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChips}
            style={{ marginBottom: 4 }}
          >
            {QUICK_CHIPS.map((q) => (
              <Pressable
                key={q}
                onPress={() => sendQuick(q)}
                style={[styles.quickChip, { backgroundColor: t.bgAlt, borderColor: t.border }]}
              >
                <Text style={[styles.quickChipText, { color: t.text }]}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {messages.map((msg) => (
          <View key={msg.id}>
            <View style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              <View style={[
                styles.bubble,
                msg.role === 'user'
                  ? [styles.bubbleUser, { backgroundColor: t.primary }]
                  : [styles.bubbleConcierge, { backgroundColor: t.surface, borderColor: t.border }],
              ]}>
                <Text style={[styles.bubbleText, { color: msg.role === 'user' ? '#FBF5E8' : t.text }]}>
                  {msg.text}
                </Text>
              </View>
            </View>
            {msg.suggestions && msg.suggestions.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.suggestions}
                style={{ marginBottom: 8 }}
              >
                {msg.suggestions.map((id) => {
                  const venue = venues.find((v) => v.id === id);
                  if (!venue) return null;
                  return (
                    <HeroCard
                      key={venue.id}
                      venue={venue}
                      t={t}
                      onOpen={() => navigation.navigate('Detail', { venueId: venue.id })}
                      onFav={() => toggleFav(venue.id)}
                      isFav={favs.has(venue.id)}
                      onBook={() => {
                        const { people, time } = extractBookingHints(messages);
                        navigation.navigate('Booking', {
                          venueId: venue.id,
                          ...(people ? { people } : {}),
                          ...(time   ? { time }   : {}),
                        });
                      }}
                    />
                  );
                })}
              </ScrollView>
            )}
          </View>
        ))}

        {typing && (
          <View style={styles.msgRow}>
            <View style={[styles.bubble, styles.bubbleConcierge, { backgroundColor: t.surface, borderColor: t.border, paddingVertical: 14 }]}>
              <View style={styles.typingDots}>
                <Animated.View style={[styles.typingDot, { backgroundColor: t.textMute, opacity: dot1 }]} />
                <Animated.View style={[styles.typingDot, { backgroundColor: t.textMute, opacity: dot2 }]} />
                <Animated.View style={[styles.typingDot, { backgroundColor: t.textMute, opacity: dot3 }]} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Composer */}
      <View style={[styles.composer, { backgroundColor: t.bg, borderTopColor: t.border, paddingBottom: insets.bottom + 8 }]}>
        {sessionId && !escalated && messages.filter(m => m.role === 'user').length >= 3 && (
          <Pressable onPress={handleEscalate} style={styles.escalateBtn}>
            <Text style={[styles.escalateText, { color: t.textMute }]}>{tr('conc_need_help')}</Text>
          </Pressable>
        )}
        <View style={[styles.inputRow, { backgroundColor: t.surface, borderColor: t.border }]}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={tr('conc_placeholder')}
            placeholderTextColor={t.textMute}
            style={[styles.input, { color: t.text }]}
            returnKeyType="send"
            onSubmitEditing={send}
            editable={!typing}
          />
          <Pressable onPress={send} style={[styles.sendBtn, { backgroundColor: typing ? t.border : t.primary }]} disabled={typing}>
            <Icon name="arrow" size={18} color="#FBF5E8" strokeWidth={2} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#6FCF97', borderWidth: 1.5, borderColor: '#14352A',
  },
  headerName: { color: '#FBF5E8', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  headerSub: { color: 'rgba(251,245,232,0.6)', fontSize: 11.5, marginTop: 1 },
  messages: { padding: 16, gap: 12 },
  msgRow: { flexDirection: 'row', maxWidth: '82%' },
  msgRowUser: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  bubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 },
  bubbleUser: { borderTopLeftRadius: 16, borderTopRightRadius: 4, borderBottomRightRadius: 16, borderBottomLeftRadius: 16 },
  bubbleConcierge: { borderTopLeftRadius: 4, borderTopRightRadius: 16, borderBottomRightRadius: 16, borderBottomLeftRadius: 16, borderWidth: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  suggestions: { paddingLeft: 16, gap: 12, paddingBottom: 4 },
  typingDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  typingDot: { width: 7, height: 7, borderRadius: 3.5 },
  composer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 999, borderWidth: 1,
    paddingLeft: 16, paddingRight: 6, paddingVertical: 6, gap: 8,
  },
  input: { flex: 1, fontSize: 14, paddingVertical: 4 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  quickChips: { gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  quickChip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  escalateBtn: { alignItems: 'center', paddingBottom: 8 },
  escalateText: { fontSize: 12, textDecorationLine: 'underline' },
  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  offlineText: { fontSize: 12 },
});
