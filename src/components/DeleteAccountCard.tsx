import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { ApiError } from '@/services/session';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

/**
 * Profile → "Delete account". Collapsed to a single button; expands to a
 * warning + password field so deletion is a deliberate two-step action.
 * Inline instead of Alert.prompt because that one is iOS-only.
 */
export function DeleteAccountCard() {
  const t = useT();
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return <Button label={t('account.delete')} variant="ghost" onPress={() => setOpen(true)} />;
  }

  const onConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
      // Success signs out; the auth gate takes over from here.
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 403
          ? t('account.wrongPassword')
          : t('account.deleteFailed'),
      );
      setBusy(false);
    }
  };

  return (
    <Card className="gap-sm border border-danger">
      <Text variant="label">{t('account.deleteTitle')}</Text>
      <Text variant="caption" muted>
        {t('account.deleteWarning')}
      </Text>
      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
        placeholder={t('account.passwordPlaceholder')}
        accessibilityLabel={t('account.passwordPlaceholder')}
        className="rounded-md border border-border bg-bg px-sm py-2 text-base text-fg dark:border-border-dark dark:bg-bg-dark dark:text-fg-dark"
      />
      {error ? (
        <Text variant="caption" style={{ color: palette.danger }}>
          {error}
        </Text>
      ) : null}
      <View className="flex-row gap-sm">
        <Button
          label={t('common.cancel')}
          variant="secondary"
          className="flex-1"
          disabled={busy}
          onPress={() => {
            setOpen(false);
            setPassword('');
            setError(null);
          }}
        />
        <Button
          label={t('account.deleteConfirm')}
          variant="danger"
          className="flex-1"
          loading={busy}
          disabled={!password}
          onPress={onConfirm}
        />
      </View>
    </Card>
  );
}
