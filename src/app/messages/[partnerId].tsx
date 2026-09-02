import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { clockTime, dayHeading } from '@/lib/date';
import api from '@/services/api';
import { useAppStore, useAthlete } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';
import type { Message, MessagePartner } from '@/types/domain';

const POLL_MS = 15_000;

function sameDay(a: string, b: string): boolean {
  return a.slice(0, 10) === b.slice(0, 10);
}

export default function ConversationScreen() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const t = useT();
  const me = useAthlete();
  const sendMessage = useAppStore((s) => s.sendMessage);
  const loadUnreadMessageCount = useAppStore((s) => s.loadUnreadMessageCount);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<MessagePartner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!partnerId) return;
    try {
      setError(null);
      const res = await api.listMessages(partnerId);
      setPartner(res.partner);
      setMessages(res.messages);
      // Opening the thread cleared unread server-side — refresh the badge.
      void loadUnreadMessageCount();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [partnerId, loadUnreadMessageCount]);

  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(() => void load(), POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  useEffect(() => {
    // Let layout settle, then pin to the newest message.
    const id = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 50);
    return () => clearTimeout(id);
  }, [messages.length]);

  const onSend = async () => {
    const body = draft.trim();
    if (!body || sending || !partnerId) return;
    setSending(true);
    setError(null);
    const optimistic: Message = {
      id: `pending_${Date.now()}`,
      senderId: me?.id ?? 'me',
      recipientId: partnerId,
      body,
      createdAt: new Date().toISOString(),
      readAt: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft('');
    try {
      const saved = await sendMessage(partnerId, body);
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } catch (e) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(body);
      setError(e instanceof Error ? e.message : t('messages.sendFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ title: partner?.name ?? t('nav.messages') }} />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        {loading && messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={palette.brand} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerClassName="p-lg gap-xs"
            keyboardDismissMode="interactive">
            {messages.length === 0 && !error ? (
              <Text variant="caption" muted className="pt-lg text-center">
                {t('messages.conversationEmpty')}
              </Text>
            ) : null}

            {messages.map((m, i) => {
              const mine = m.senderId === me?.id;
              const showDay = i === 0 || !sameDay(messages[i - 1].createdAt, m.createdAt);
              return (
                <Fragment key={m.id}>
                  {showDay ? (
                    <Text variant="caption" muted className="self-center py-sm">
                      {dayHeading(m.createdAt)}
                    </Text>
                  ) : null}
                  <View
                    className={`max-w-[80%] rounded-2xl px-md py-2 ${
                      mine
                        ? 'self-end bg-brand'
                        : 'self-start bg-surface-alt dark:bg-surface-alt-dark'
                    }`}>
                    <Text className={mine ? 'text-white' : 'text-fg dark:text-fg-dark'}>
                      {m.body}
                    </Text>
                    <Text
                      variant="caption"
                      className={`mt-0.5 ${mine ? 'text-white/70' : 'text-muted dark:text-muted-dark'}`}>
                      {clockTime(m.createdAt)}
                    </Text>
                  </View>
                </Fragment>
              );
            })}
          </ScrollView>
        )}

        {error ? (
          <View className="mx-lg mb-1 flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-1.5">
            <Ionicons name="alert-circle" size={14} color={palette.danger} />
            <Text variant="caption" className="flex-1 text-danger">
              {error}
            </Text>
          </View>
        ) : null}

        <View className="flex-row items-end gap-sm border-t border-border px-lg py-2 dark:border-border-dark">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('messages.composerPlaceholder')}
            placeholderTextColor={palette.textFaint}
            multiline
            maxLength={4000}
            className="max-h-28 flex-1 rounded-2xl border border-border bg-bg px-md py-2 text-base text-fg dark:border-border-dark dark:bg-bg-dark dark:text-fg-dark"
          />
          <Pressable
            onPress={onSend}
            disabled={sending || draft.trim().length === 0}
            className={`h-10 w-10 items-center justify-center rounded-full bg-brand ${
              sending || draft.trim().length === 0 ? 'opacity-40' : ''
            }`}>
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
