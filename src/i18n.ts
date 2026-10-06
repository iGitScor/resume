export interface Labels {
  summary: string;
  work: string;
  volunteer: string;
  education: string;
  skills: string;
  languages: string;
  interests: string;
  references: string;
  present: string;
  language: string;
  viewPdf: string;
  levels: Record<string, string>;
}

export interface Locale {
  code: string;
  /** The page's folder under the site root. */
  path: string;
  /** The relative way back from the page to the site root. */
  root: string;
  short: string;
  name: string;
  ogLocale: string;
  labels: Labels;
}

export const locales: Record<'en' | 'fr', Locale> = {
  en: {
    code: 'en',
    path: '',
    root: '',
    short: 'EN',
    name: 'English',
    ogLocale: 'en_US',
    labels: {
      summary: 'Profile',
      work: 'Experience',
      volunteer: 'Volunteering',
      education: 'Education',
      skills: 'Skills',
      languages: 'Languages',
      interests: 'Interests',
      references: 'References',
      present: 'Present',
      language: 'Language',
      viewPdf: 'View PDF',
      levels: { master: 'Master', advanced: 'Advanced', intermediate: 'Intermediate', beginner: 'Beginner' },
    },
  },
  fr: {
    code: 'fr',
    path: 'fr/',
    root: '../',
    short: 'FR',
    name: 'Français',
    ogLocale: 'fr_FR',
    labels: {
      summary: 'Profil',
      work: 'Expérience',
      volunteer: 'Bénévolat',
      education: 'Formation',
      skills: 'Compétences',
      languages: 'Langues',
      interests: 'Centres d’intérêt',
      references: 'Recommandations',
      present: 'Aujourd’hui',
      language: 'Langue',
      viewPdf: 'Voir le PDF',
      levels: { master: 'Maîtrise', advanced: 'Avancé', intermediate: 'Intermédiaire', beginner: 'Débutant' },
    },
  },
};

/** Published at the site root; the other locales live in their own folder. */
export const defaultLocale = locales.en;

// JSON Resume dates are `YYYY`, `YYYY-MM` or `YYYY-MM-DD`; the day is never displayed.
export function formatDate(value: string, locale: Locale): string {
  const [year, month] = value.split('-').map(Number);
  if (!month) return String(year);
  return new Intl.DateTimeFormat(locale.code, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}
