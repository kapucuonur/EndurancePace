import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: palette.border,
          backgroundColor: palette.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/login'))}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
          <Ionicons name="arrow-back" size={22} color={palette.brand} />
          <Text variant="caption" className="font-semibold text-brand">
            Back
          </Text>
        </Pressable>
        <Text variant="heading" style={{ fontSize: 18, fontWeight: '700' }}>
          Privacy Policy
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 60,
          maxWidth: 800,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={true}>
        <View style={{ gap: 20 }}>
          <View>
            <Text variant="title" style={{ fontSize: 24, fontWeight: '800', marginBottom: 6 }}>
              EndurancePace Privacy Policy
            </Text>
            <Text variant="caption" muted>
              Last Updated: October 24, 2026
            </Text>
          </View>

          <Text variant="body">
            Welcome to EndurancePace (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;),
            provided by CoachOnur AI. We are dedicated to protecting your personal privacy and
            safeguarding your health and athletic data. This Privacy Policy explains how we
            collect, use, process, and protect your information when you use our mobile and web
            applications and associated services.
          </Text>

          <Section title="1. Information We Collect">
            <Paragraph title="a. Account & Identity Data">
              When you register for EndurancePace, we collect your name, email address, password
              credentials (stored in hashed form), and user preferences (such as preferred
              language and units).
            </Paragraph>
            <Paragraph title="b. Fitness, Athletic & Health Data">
              To provide personalized athletic pacing, training load metrics, and coaching
              insights, we process:
            </Paragraph>
            <Bullet text="Activity records: duration, distance, pace, speed, elevation, and workout categories (running, cycling, swimming, etc.)." />
            <Bullet text="Physiological and sensor metrics: heart rate, heart rate zones, cadence, power, and estimated caloric expenditure." />
            <Bullet text="Activity location: the activity summaries we receive from Garmin may include the start location of a workout. We do not store full GPS route tracks." />
            <Bullet text="Performance analytics: Training Stress Score (TSS) and training zones derived from your thresholds." />
            <Paragraph title="c. Garmin Connect">
              If you choose to connect your Garmin account, EndurancePace imports your recent
              activity records and training thresholds (such as FTP and lactate threshold heart
              rate) from Garmin Connect. Your Garmin sign-in details and session tokens are
              stored encrypted and used only to sync your own data. You can disconnect at any
              time.
            </Paragraph>
          </Section>

          <Section title="2. How We Use Your Data">
            <Bullet text="Deliver adaptive training plans, workout execution guidelines, and intelligent endurance pacing recommendations." />
            <Bullet text="Calculate training load (TSS) and heart rate, power and pace zones for your workouts." />
            <Bullet text="Import completed workouts from your connected Garmin account." />
            <Bullet text="Facilitate messages and workout feedback between athletes and coaches on the platform." />
            <Bullet text="Maintain platform security, authenticate accounts, and provide customer support." />
          </Section>

          <Section title="3. Data Sharing & Disclosure">
            <Text variant="body" style={{ fontWeight: '600' }}>
              We DO NOT sell, rent, or commercialize your personal or health data to advertisers
              or third parties under any circumstances.
            </Text>
            <Paragraph title="Data is shared only in the following limited contexts:">
              -{' '}
              <Text variant="body" style={{ fontWeight: '600' }}>
                Your Coach:
              </Text>{' '}
              If you link your account with a coach on the platform, your coach can view your
              planned and executed workouts.
              {'\n'}-{' '}
              <Text variant="body" style={{ fontWeight: '600' }}>
                Service Providers:
              </Text>{' '}
              Cloud hosting and infrastructure providers that assist in running our encrypted
              servers, operating under strict confidentiality and data protection agreements.
              {'\n'}-{' '}
              <Text variant="body" style={{ fontWeight: '600' }}>
                Legal Requirements:
              </Text>{' '}
              If required by applicable laws, regulations, or court orders.
            </Paragraph>
          </Section>

          <Section title="4. Security & Storage">
            <Text variant="body">
              All communications between your device and our servers are encrypted using
              industry-standard TLS / HTTPS encryption. Account passwords are stored only as
              salted hashes, and third-party credentials and tokens (such as your Garmin
              connection) are encrypted at rest. Access to our servers is restricted.
            </Text>
          </Section>

          <Section title="5. Your Rights & Data Deletion">
            <Text variant="body">
              You retain full ownership of your data. You have the right to:
            </Text>
            <Bullet text="Disconnect Garmin at any time from Profile → Connections, which immediately stops syncing and removes the stored connection." />
            <Bullet text="Request a copy of your data (workout history, plans and profile) by contacting us; we respond within 30 days." />
            <Bullet text="Delete your account and data at any time from Profile → Delete account in the app (web or mobile). All your personal information, credentials, and synced workout records are permanently removed from our databases." />
          </Section>

          <Section title="6. Contact Us">
            <Text variant="body">
              If you have any questions, feedback, or requests regarding this Privacy Policy or
              your personal data, please reach out to us at:
            </Text>
            <Text
              variant="body"
              style={{ fontWeight: '600', color: palette.brand, marginTop: 4 }}>
              Email: privacy@coachonurai.com
            </Text>
            <Text variant="body" muted style={{ marginTop: 2 }}>
              CoachOnur AI / EndurancePace Team
            </Text>
          </Section>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      <Text variant="title" style={{ fontSize: 18, fontWeight: '700', color: palette.text }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Paragraph({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, marginTop: 4 }}>
      <Text variant="body" style={{ fontWeight: '600', color: palette.text }}>
        {title}
      </Text>
      <Text variant="body" style={{ lineHeight: 22, color: palette.textMuted }}>
        {children}
      </Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingLeft: 4 }}>
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: palette.brand,
          marginTop: 8,
        }}
      />
      <Text variant="body" style={{ flex: 1, lineHeight: 22, color: palette.textMuted }}>
        {text}
      </Text>
    </View>
  );
}
