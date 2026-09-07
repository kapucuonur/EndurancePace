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
          onPress={() => router.canGoBack() ? router.back() : router.replace('/login')}
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
              Last Updated: September 7, 2026
            </Text>
          </View>

          <Text variant="body">
            Welcome to EndurancePace ("we", "our", or "us"), provided by CoachOnur AI. We are dedicated
            to protecting your personal privacy and safeguarding your health and athletic data.
            This Privacy Policy explains how we collect, use, process, and protect your information
            when you use our mobile and web applications and associated services.
          </Text>

          <Section title="1. Information We Collect">
            <Paragraph title="a. Account & Identity Data">
              When you register for EndurancePace, we collect your name, email address, password
              credentials (stored in hashed form), and user preferences (such as preferred language and units).
            </Paragraph>
            <Paragraph title="b. Fitness, Athletic & Health Data">
              To provide personalized athletic pacing, training load metrics, and coaching insights, we process:
            </Paragraph>
            <Bullet text="Activity records: duration, distance, pace, speed, elevation, and workout categories (running, cycling, swimming, etc.)." />
            <Bullet text="Physiological and sensor metrics: heart rate, heart rate zones, cadence, power, and estimated caloric expenditure." />
            <Bullet text="Geographic location & GPS tracks: route files and coordinates recorded during outdoor workouts to analyze pace and elevation." />
            <Bullet text="Performance analytics: Training Stress Score (TSS), Chronic Training Load (CTL), Acute Training Load (ATL), and Training Stress Balance (TSB)." />
            <Paragraph title="c. Third-Party Integrations (Garmin Connect, Huawei Health, etc.)">
              With your explicit authorization via OAuth or API integration, EndurancePace connects to external fitness ecosystems (such as Garmin Connect and Huawei Health Kit). We only access data scopes for which you have granted permission, specifically historical and ongoing activity records and fitness statistics.
            </Paragraph>
          </Section>

          <Section title="2. How We Use Your Data">
            <Bullet text="Deliver adaptive training plans, workout execution guidelines, and intelligent endurance pacing recommendations." />
            <Bullet text="Calculate fatigue, fitness, and form trends (CTL / ATL / TSB) to help prevent overtraining and optimize race readiness." />
            <Bullet text="Synchronize athletic workouts across your connected devices and platforms." />
            <Bullet text="Facilitate communication and workout feedback between athletes and certified coaches." />
            <Bullet text="Maintain platform security, authenticate accounts, and provide customer support." />
          </Section>

          <Section title="3. Data Sharing & Disclosure">
            <Text variant="body" style={{ fontWeight: '600' }}>
              We DO NOT sell, rent, or commercialize your personal or health data to advertisers or third parties under any circumstances.
            </Text>
            <Paragraph title="Data is shared only in the following limited contexts:">
              - <Text variant="body" style={{ fontWeight: '600' }}>Your Coach:</Text> If you link your account with a coach on the platform, your coach can view your planned and executed workouts.
              {'\n'}- <Text variant="body" style={{ fontWeight: '600' }}>Service Providers:</Text> Cloud hosting and infrastructure providers that assist in running our encrypted servers, operating under strict confidentiality and data protection agreements.
              {'\n'}- <Text variant="body" style={{ fontWeight: '600' }}>Legal Requirements:</Text> If required by applicable laws, regulations, or court orders.
            </Paragraph>
          </Section>

          <Section title="4. Security & Storage">
            <Text variant="body">
              All communications between your device and our servers are encrypted using industry-standard TLS / HTTPS encryption. Athletic records, authentication tokens, and credentials are encrypted at rest with stringent access controls.
            </Text>
          </Section>

          <Section title="5. Your Rights & Data Deletion">
            <Text variant="body">
              You retain full ownership of your data. You have the right to:
            </Text>
            <Bullet text="Disconnect external fitness services (Garmin, Huawei Health) at any time from Settings, which immediately halts syncing." />
            <Bullet text="Export your workout history and training logs." />
            <Bullet text="Request complete account and data deletion. Upon request, all your personal information, credentials, and synced workout records will be permanently removed from our databases." />
          </Section>

          <Section title="6. Contact Us">
            <Text variant="body">
              If you have any questions, feedback, or requests regarding this Privacy Policy or your personal data, please reach out to us at:
            </Text>
            <Text variant="body" style={{ fontWeight: '600', color: palette.brand, marginTop: 4 }}>
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
