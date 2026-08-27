import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { USE_MOCK_API } from '@/services/config';
import { useAppStore } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

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
    <Screen className="justify-center px-xl">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="gap-xs">
          <Text variant="display">EndurancePace</Text>
          <Text muted>
            {mode === 'signin' ? 'Sign in to your training log.' : 'Create your account.'}
          </Text>
        </View>

        <View className="mt-xl gap-md">
          {mode === 'signup' ? (
            <Field
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Alex Rivera"
              autoCapitalize="words"
            />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            secureTextEntry
            autoCapitalize="none"
          />

          {error ? (
            <Text variant="caption" className="text-danger">
              {error}
            </Text>
          ) : null}

          <Button
            label={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={busy}
            disabled={!canSubmit}
          />

          <Pressable
            onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
            className="items-center py-sm">
            <Text variant="caption" className="text-brand">
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>

          {USE_MOCK_API ? (
            <Text variant="caption" muted className="text-center">
              Mock mode — any email/password works.
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="gap-xs">
      <Text variant="label" muted>
        {label}
      </Text>
      <TextInput
        {...props}
        placeholderTextColor={palette.textFaint}
        className="rounded-md border border-border bg-surface px-md py-3 text-base text-fg dark:border-border-dark dark:bg-surface-dark dark:text-fg-dark"
      />
    </View>
  );
}
