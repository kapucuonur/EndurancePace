import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { USE_MOCK_API } from '@/services/config';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

type Mode = 'signin' | 'signup';
type FieldName = 'name' | 'email' | 'password';

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },
  elevation: 4,
} as const;

export default function LoginScreen() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [focused, setFocused] = useState<FieldName | null>(null);

  const signIn = useAppStore((s) => s.signIn);
  const signUp = useAppStore((s) => s.signUp);
  const busy = useAppStore((s) => s.session.busy);
  const error = useAppStore((s) => s.session.error);

  const canSubmit = email.trim().length > 3 && password.length >= 8 && !busy;

  const submit = async () => {
    try {
      if (mode === 'signin') await signIn(email, password);
      else await signUp(email, password, name);
      // the root layout's gate navigates on token change
    } catch {
      // error is surfaced via session.error
    }
  };

  return (
    <Screen className="justify-center">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1">
        <ScrollView
          contentContainerClassName="grow justify-center items-center px-lg py-2xl"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View className="w-full max-w-[400px]">
            {/* Brand mark */}
            <View className="mb-2xl items-center gap-md">
              <View className="items-center justify-center">
                <View className="absolute h-24 w-24 rounded-full bg-brand-tint dark:bg-surface-alt-dark" />
                <View
                  className="h-16 w-16 items-center justify-center rounded-xl bg-brand"
                  style={cardShadow}>
                  <Ionicons name="pulse" size={30} color="#fff" />
                </View>
              </View>
              <View className="items-center gap-xs">
                <View className="flex-row">
                  <Text variant="title">Endurance</Text>
                  <Text variant="title" className="text-brand">
                    Pace
                  </Text>
                </View>
                <Text variant="caption" muted>
                  {mode === 'signin' ? t('login.signInSubtitle') : t('login.signUpSubtitle')}
                </Text>
              </View>
            </View>

            {/* Form card */}
            <View
              className="gap-md rounded-lg border border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark"
              style={cardShadow}>
              {mode === 'signup' ? (
                <Field
                  label={t('login.name')}
                  value={name}
                  onChangeText={setName}
                  placeholder={t('login.namePlaceholder')}
                  autoCapitalize="words"
                  focused={focused === 'name'}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused(null)}
                />
              ) : null}
              <Field
                label={t('login.email')}
                value={email}
                onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                focused={focused === 'email'}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
              <Field
                label={t('login.password')}
                value={password}
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                focused={focused === 'password'}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />

              {error ? (
                <View className="flex-row items-center gap-xs rounded-md bg-danger/10 px-md py-2">
                  <Ionicons name="alert-circle" size={15} color={palette.danger} />
                  <Text variant="caption" className="flex-1 text-danger">
                    {error}
                  </Text>
                </View>
              ) : null}

              <Button
                label={mode === 'signin' ? t('login.signIn') : t('login.createAccount')}
                onPress={submit}
                loading={busy}
                disabled={!canSubmit}
                className="mt-xs"
              />
            </View>

            {/* Mode toggle */}
            <Pressable
              onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
              className="mt-lg items-center py-sm">
              <Text variant="caption" muted>
                {mode === 'signin' ? t('login.noAccount') : t('login.haveAccount')}
                <Text variant="caption" className="font-semibold text-brand">
                  {mode === 'signin' ? t('login.signUpLink') : t('login.signInLink')}
                </Text>
              </Text>
            </Pressable>

            {USE_MOCK_API ? (
              <Text variant="caption" muted className="mt-xs text-center">
                {t('login.mockNote')}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  focused,
  ...props
}: {
  label: string;
  focused?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-xs">
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.textFaint}
        style={focused ? cardShadow : undefined}
        className={`rounded-md border bg-bg px-md py-3 text-base text-fg dark:bg-bg-dark dark:text-fg-dark ${
          focused ? 'border-brand' : 'border-border dark:border-border-dark'
        }`}
      />
    </View>
  );
}
