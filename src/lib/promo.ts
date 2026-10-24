/**
 * Links to our other apps, tagged with UTM params so CoachOnur AI / BikeFit
 * analytics can attribute visits (and subscriptions) to EndurancePace.
 * `campaign` says where in this app the click came from.
 */

export const AI_COACH_URL = 'https://www.coachonurai.com';
export const BIKEFIT_URL = 'https://bikefit.coachonurai.com';

export type PromoCampaign = 'profile' | 'plans' | 'activity';

export function promoUrl(base: string, campaign: PromoCampaign): string {
  const params = new URLSearchParams({
    utm_source: 'endurancepace',
    utm_medium: 'app',
    utm_campaign: campaign,
  });
  return `${base}/?${params.toString()}`;
}
