import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import heroImage from '@/assets/images/login-hero.jpg';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { LOCALE_LABELS, SUPPORTED_LOCALES } from '@/i18n';
import { useT } from '@/i18n/useT';
import { USE_MOCK_API } from '@/services/config';
import { useAppStore, useLocale } from '@/store/useAppStore';
import { palette } from '@/theme/tokens';

type Mode = 'signin' | 'signup';
type FieldName = 'name' | 'email' | 'password';

const softShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 16 },
  elevation: 6,
} as const;

const GRADIENT = ['rgba(9,12,18,0.15)', 'rgba(9,12,18,0.55)', 'rgba(9,12,18,0.92)'] as const;

export default function LoginScreen() {
  const t = useT();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;

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
    } catch {
      // error is surfaced via session.error
    }
  };

  const heroContent = (pad: number) => (
    <LinearGradient
      colors={GRADIENT}
      locations={[0, 0.55, 1]}
      style={{
        flex: 1,
        justifyContent: 'space-between',
        padding: pad,
        paddingTop: pad + insets.top,
      }}>
      <Wordmark onImage />
      <View style={{ gap: 4 }}>
        <Text
          className="text-white"
          numberOfLines={2}
          style={{ fontSize: wide ? 34 : 24, fontWeight: '800', letterSpacing: -0.5 }}>
          {t('login.tagline')}
        </Text>
        <Text className="text-white/80" numberOfLines={3} style={{ fontSize: wide ? 15 : 13 }}>
          {t('login.taglineSub')}
        </Text>
      </View>
    </LinearGradient>
  );

  const card = (
    <View
      className="gap-md rounded-2xl border border-border bg-surface p-lg dark:border-border-dark dark:bg-surface-dark"
      style={[softShadow, { width: '100%' }]}>
      <View style={{ gap: 2 }}>
        <Text variant="title" style={{ letterSpacing: -0.4 }}>
          {mode === 'signin' ? t('login.welcomeBack') : t('login.getStarted')}
        </Text>
        <Text variant="caption" muted>
          {mode === 'signin' ? t('login.signInSubtitle') : t('login.signUpSubtitle')}
        </Text>
      </View>

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

      <Pressable
        onPress={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
        className="items-center py-1">
        <Text variant="caption" muted>
          {mode === 'signin' ? t('login.noAccount') : t('login.haveAccount')}
          <Text variant="caption" className="font-semibold text-brand">
            {mode === 'signin' ? t('login.signUpLink') : t('login.signInLink')}
          </Text>
        </Text>
      </Pressable>
    </View>
  );

  const formColumn = (
    <View style={{ width: '100%', maxWidth: 416, gap: 16 }}>
      {card}
      <LanguageRow />
      {USE_MOCK_API ? (
        <Text variant="caption" muted className="text-center">
          {t('login.mockNote')}
        </Text>
      ) : null}
    </View>
  );

  if (wide) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', backgroundColor: palette.bg }}>
        <View style={{ flex: 1.15, overflow: 'hidden' }}>
          <Image
            source={heroImage}
            contentFit="cover"
            transition={300}
            accessibilityLabel={t('login.heroAlt')}
            style={StyleSheet.absoluteFill}
          />
          {heroContent(40)}
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          {formColumn}
        </View>
      </View>
    );
  }

  const heroH = Math.min(300, Math.max(200, Math.round(height * 0.32)));

  return (
    <View style={{ flex: 1, width, overflow: 'hidden', backgroundColor: palette.bg }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ minHeight: '100%', paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={{ width, height: heroH, overflow: 'hidden' }}>
            <Image
              source={heroImage}
              contentFit="cover"
              transition={300}
              accessibilityLabel={t('login.heroAlt')}
              style={StyleSheet.absoluteFill}
            />
            {heroContent(24)}
          </View>
          <View
            style={{
              width,
              flexGrow: 1,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingHorizontal: 20,
              paddingTop: 28,
              paddingBottom: 24,
            }}>
            {formColumn}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Wordmark({ onImage }: { onImage?: boolean }) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        className="h-8 w-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: onImage ? 'rgba(255,255,255,0.16)' : palette.brand }}>
        <Ionicons name="pulse" size={18} color="#fff" />
      </View>
      <View className="flex-row">
        <Text
          style={{ fontSize: 18, fontWeight: '700' }}
          className={onImage ? 'text-white' : undefined}>
          Endurance
        </Text>
        <Text
          style={{ fontSize: 18, fontWeight: '700' }}
          className={onImage ? 'text-white/70' : 'text-brand'}>
          Pace
        </Text>
      </View>
    </View>
  );
}

function LanguageRow() {
  const locale = useLocale();
  const setLocale = useAppStore((s) => s.setLocale);
  return (
    <View className="flex-row flex-wrap items-center justify-center gap-x-md gap-y-1">
      {SUPPORTED_LOCALES.map((loc) => {
        const on = loc === locale;
        return (
          <Pressable key={loc} onPress={() => void setLocale(loc)} hitSlop={6}>
            <Text
              variant="caption"
              muted={!on}
              className={on ? 'font-semibold text-brand' : undefined}>
              {LOCALE_LABELS[loc]}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
        className={`rounded-md border bg-bg px-md py-3 text-base text-fg dark:bg-bg-dark dark:text-fg-dark ${
          focused ? 'border-brand' : 'border-border dark:border-border-dark'
        }`}
      />
    </View>
  );
}
