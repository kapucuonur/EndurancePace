import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, View } from 'react-native';

import aiCoachIcon from '@/assets/images/promo/ai-coach.png';
import bikefitIcon from '@/assets/images/promo/bikefit.png';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { useT } from '@/i18n/useT';
import { AI_COACH_URL, BIKEFIT_URL, promoUrl } from '@/lib/promo';
import { palette } from '@/theme/tokens';

/**
 * Profile → "More from TriHonor": our other apps. Links go to each app's
 * website rather than a store listing — works on iOS/web too, and Huawei
 * AppGallery doesn't allow sending users to another store.
 */
const APPS = [
  {
    key: 'bikefit',
    name: 'BikeFit AI',
    icon: bikefitIcon,
    url: promoUrl(BIKEFIT_URL, 'profile'),
  },
  {
    key: 'aiCoach',
    name: 'CoachOnur AI',
    icon: aiCoachIcon,
    url: promoUrl(AI_COACH_URL, 'profile'),
  },
] as const;

export function MoreAppsCard() {
  const t = useT();
  return (
    <View className="gap-sm">
      <Text variant="heading">{t('promo.title')}</Text>
      {APPS.map((app) => (
        <Card
          key={app.key}
          onPress={() => void Linking.openURL(app.url)}
          className="flex-row items-center gap-md">
          <Image
            source={app.icon}
            style={{ width: 44, height: 44, borderRadius: 10 }}
            accessibilityIgnoresInvertColors
          />
          <View className="flex-1">
            <Text variant="label">{app.name}</Text>
            <Text variant="caption" muted>
              {t(`promo.${app.key}`)}
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={palette.textFaint} />
        </Card>
      ))}
    </View>
  );
}
