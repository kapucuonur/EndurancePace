import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { relativeTime } from '@/lib/date';
import { useAppStore, useMessages } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

export default function MessagesScreen() {
  const router = useRouter();
  const t = useT();
  const { threads, loading, error } = useMessages();
  const loadMessageThreads = useAppStore((s) => s.loadMessageThreads);

  useFocusEffect(
    useCallback(() => {
      void loadMessageThreads();
    }, [loadMessageThreads]),
  );

  return (
    <Screen edges={['top', 'left', 'right']}>
      <View className="px-lg py-sm">
        <Text variant="title">{t('nav.messages')}</Text>
      </View>
      <ScrollView
        contentContainerClassName="p-lg gap-sm pb-24"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => void loadMessageThreads()} />
        }>
        {error ? (
          <View className="flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-2">
            <Ionicons name="alert-circle" size={15} color={palette.danger} />
            <Text variant="caption" className="flex-1 text-danger">
              {error}
            </Text>
          </View>
        ) : null}

        {!loading && threads.length === 0 && !error ? (
          <View className="gap-xs pt-lg">
            <Text muted>{t('messages.empty')}</Text>
            <Text variant="caption" muted>
              {t('messages.emptyHint')}
            </Text>
          </View>
        ) : null}

        {threads.map((thread) => {
          const { partner, lastMessage, unreadCount } = thread;
          return (
            <Card
              key={partner.id}
              onPress={() => router.push(`/messages/${partner.id}`)}
              className="flex-row items-center gap-md">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-tint dark:bg-surface-alt-dark">
                <Text variant="label" className="text-brand">
                  {partner.name.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text variant="label" numberOfLines={1} className="flex-1">
                    {partner.name}
                  </Text>
                  <Text variant="caption" muted>
                    {relativeTime(lastMessage.createdAt)}
                  </Text>
                </View>
                <Text
                  variant="caption"
                  muted={unreadCount === 0}
                  numberOfLines={1}
                  className={unreadCount > 0 ? 'font-medium' : undefined}>
                  {lastMessage.body}
                </Text>
              </View>
              {unreadCount > 0 ? (
                <View className="h-5 min-w-[20px] items-center justify-center rounded-full bg-brand px-1">
                  <Text variant="caption" className="text-white">
                    {unreadCount}
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </ScrollView>
    </Screen>
  );
}
