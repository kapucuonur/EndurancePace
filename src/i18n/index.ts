/**
 * App localization. `expo-localization` gives the device language; `i18n-js`
 * holds the translation tables. The active locale lives in the Zustand store
 * (`useAppStore`) — this module just owns the i18n instance and a mirrored
 * module-level copy so non-React helpers (date formatting) can read it too.
 */

import { getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import { LocaleConfig } from 'react-native-calendars';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ru from './locales/ru.json';
import tr from './locales/tr.json';

export const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'ru', 'it', 'es'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Endonyms — always shown in their own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
  ru: 'Русский',
  it: 'Italiano',
  es: 'Español',
};

export const i18n = new I18n({ en, tr, de, ru, it, es });
i18n.enableFallback = true;
i18n.defaultLocale = 'en';
i18n.missingBehavior = 'guess';

let active: Locale = 'en';

/** Current locale, for non-React code (see `lib/date.ts`). */
export function activeLocale(): Locale {
  return active;
}

/** Point i18n + react-native-calendars at `locale`. Call on boot and on change. */
export function applyLocale(locale: Locale): void {
  active = locale;
  i18n.locale = locale;
  LocaleConfig.locales[locale] = CALENDAR_LOCALES[locale];
  LocaleConfig.defaultLocale = locale;
}

/** The device's preferred language when we ship it, otherwise English. */
export function deviceLocale(): Locale {
  const code = getLocales()[0]?.languageCode;
  return isSupported(code) ? code : 'en';
}

export function isSupported(code: string | null | undefined): code is Locale {
  return !!code && (SUPPORTED_LOCALES as readonly string[]).includes(code);
}

/** Month + day names for the calendar grid, keyed by locale. */
const CALENDAR_LOCALES: Record<Locale, (typeof LocaleConfig)['locales'][string]> = {
  en: {
    monthNames:
      'January February March April May June July August September October November December'.split(
        ' ',
      ),
    monthNamesShort: 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '),
    dayNames: 'Sunday Monday Tuesday Wednesday Thursday Friday Saturday'.split(' '),
    dayNamesShort: 'Sun Mon Tue Wed Thu Fri Sat'.split(' '),
  },
  tr: {
    monthNames:
      'Ocak Şubat Mart Nisan Mayıs Haziran Temmuz Ağustos Eylül Ekim Kasım Aralık'.split(' '),
    monthNamesShort: 'Oca Şub Mar Nis May Haz Tem Ağu Eyl Eki Kas Ara'.split(' '),
    dayNames: 'Pazar Pazartesi Salı Çarşamba Perşembe Cuma Cumartesi'.split(' '),
    dayNamesShort: 'Paz Pzt Sal Çar Per Cum Cmt'.split(' '),
  },
  de: {
    monthNames:
      'Januar Februar März April Mai Juni Juli August September Oktober November Dezember'.split(
        ' ',
      ),
    monthNamesShort: 'Jan Feb Mär Apr Mai Jun Jul Aug Sep Okt Nov Dez'.split(' '),
    dayNames: 'Sonntag Montag Dienstag Mittwoch Donnerstag Freitag Samstag'.split(' '),
    dayNamesShort: 'So Mo Di Mi Do Fr Sa'.split(' '),
  },
  ru: {
    monthNames:
      'Январь Февраль Март Апрель Май Июнь Июль Август Сентябрь Октябрь Ноябрь Декабрь'.split(
        ' ',
      ),
    monthNamesShort: 'Янв Фев Мар Апр Май Июн Июл Авг Сен Окт Ноя Дек'.split(' '),
    dayNames: 'Воскресенье Понедельник Вторник Среда Четверг Пятница Суббота'.split(' '),
    dayNamesShort: 'Вс Пн Вт Ср Чт Пт Сб'.split(' '),
  },
  it: {
    monthNames:
      'Gennaio Febbraio Marzo Aprile Maggio Giugno Luglio Agosto Settembre Ottobre Novembre Dicembre'.split(
        ' ',
      ),
    monthNamesShort: 'Gen Feb Mar Apr Mag Giu Lug Ago Set Ott Nov Dic'.split(' '),
    dayNames: 'Domenica Lunedì Martedì Mercoledì Giovedì Venerdì Sabato'.split(' '),
    dayNamesShort: 'Dom Lun Mar Mer Gio Ven Sab'.split(' '),
  },
  es: {
    monthNames:
      'Enero Febrero Marzo Abril Mayo Junio Julio Agosto Septiembre Octubre Noviembre Diciembre'.split(
        ' ',
      ),
    monthNamesShort: 'Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic'.split(' '),
    dayNames: 'Domingo Lunes Martes Miércoles Jueves Viernes Sábado'.split(' '),
    dayNamesShort: 'Dom Lun Mar Mié Jue Vie Sáb'.split(' '),
  },
};
