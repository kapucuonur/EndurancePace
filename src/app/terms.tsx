import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { palette } from '@/theme/tokens';

export default function TermsOfServiceScreen() {
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
          User Agreement
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
              EndurancePace User Agreement & Terms of Service
            </Text>
            <Text variant="caption" muted>
              Last Updated: September 7, 2026
            </Text>
          </View>

          <Text variant="body">
            These Terms of Service ("Terms") constitute a legally binding agreement between you and
            EndurancePace / CoachOnur AI ("Company", "we", "us", or "our") concerning your access to
            and use of the EndurancePace mobile and web applications. By accessing or using our
            services, you acknowledge that you have read, understood, and agree to be bound by these
            Terms.
          </Text>

          <Section title="1. Eligibility and Account Registration">
            <Text variant="body" style={{ color: palette.textMuted, lineHeight: 22 }}>
              You must be at least 16 years of age to register an account. You agree to provide
              accurate, current, and complete registration information and maintain the security of
              your account credentials. You are responsible for all activities that occur under your
              account.
            </Text>
          </Section>

          <Section title="2. Description of Service">
            <Text variant="body" style={{ color: palette.textMuted, lineHeight: 22 }}>
              EndurancePace provides endurance sports analytics, training load calculations (TSS,
              CTL, ATL, TSB), pacing strategies, and workout synchronizations with supported
              ecosystems (such as Garmin Connect and Huawei Health).
            </Text>
          </Section>

          <Section title="3. Medical & Physical Activity Disclaimer">
            <View
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                borderWidth: 1,
                borderRadius: 8,
                padding: 14,
                gap: 6,
              }}>
              <Text variant="body" style={{ fontWeight: '700', color: palette.danger }}>
                IMPORTANT HEALTH NOTICE:
              </Text>
              <Text variant="caption" style={{ color: palette.text, lineHeight: 20 }}>
                EndurancePace is a training analytics tool and NOT a medical device. The training plans,
                metrics, and coaching recommendations provided are for athletic preparation and
                informational purposes only. Always consult a licensed medical professional before
                commencing any high-intensity endurance training program. You participate in physical
                exercise at your own risk.
              </Text>
            </View>
          </Section>

          <Section title="4. Third-Party Services and APIs">
            <Text variant="body" style={{ color: palette.textMuted, lineHeight: 22 }}>
              EndurancePace integrates with third-party fitness platforms including Garmin Connect,
              Huawei Health Kit, and related APIs. Your use of those third-party services is subject
              to their respective terms and privacy policies. We are not liable for any downtime,
              data inaccuracy, or service changes originating from third-party API providers.
            </Text>
          </Section>

          <Section title="5. User Conduct & Acceptable Use">
            <Bullet text="You agree not to reverse engineer, decompile, or tamper with the application or underlying algorithms." />
            <Bullet text="You agree not to upload malicious scripts, spam other athletes or coaches, or abuse communication channels." />
            <Bullet text="You agree to respect intellectual property rights, copyrights, and coaching content created within the platform." />
          </Section>

          <Section title="6. Termination of Service">
            <Text variant="body" style={{ color: palette.textMuted, lineHeight: 22 }}>
              We reserve the right to suspend or terminate accounts that violate these Terms or engage
              in abusive or fraudulent behavior. You may terminate your account at any time by
              contacting support or deleting your account from within application settings.
            </Text>
          </Section>

          <Section title="7. Contact Information">
            <Text variant="body">
              For questions regarding this User Agreement, please contact:
            </Text>
            <Text variant="body" style={{ fontWeight: '600', color: palette.brand, marginTop: 4 }}>
              Email: legal@coachonurai.com
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
