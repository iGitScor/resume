import { defaultLocale, formatDate, locales, type Locale } from './i18n.ts';
import type { Basics, Location, Resume, Site } from './types.ts';

interface Entry {
  title: string;
  org?: string;
  /** Shown after the organisation, e.g. its sector and city. */
  context?: string;
  url?: string;
  startDate?: string;
  endDate?: string;
  summary?: string;
  highlights?: string[];
  pdfHighlights?: number;
  webOnly?: boolean;
}

interface Pair {
  term: string;
  note?: string;
  detail: string;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

const e = escapeHtml;
const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
const link = (href: string, text: string) => `<a href="${e(href)}">${e(text)}</a>`;
const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const truncate = (text: string, max = 160) =>
  text.length <= max ? text : `${text.slice(0, text.lastIndexOf(' ', max - 1))}…`;
const place = ({ address, city, region }: Location = {}) =>
  [...new Set([address, city, region].filter(Boolean))].join(', ');
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const time = (value: string, locale: Locale) =>
  `<time datetime="${e(value)}">${e(formatDate(value, locale))}</time>`;

// A period that starts and ends on the same value (a single year, say) is shown once.
const dateRange = (startDate: string, endDate: string | undefined, locale: Locale) =>
  startDate === endDate
    ? time(startDate, locale)
    : `${time(startDate, locale)} – ${endDate ? time(endDate, locale) : e(locale.labels.present)}`;

const section = (id: string, title: string, body: string | undefined) =>
  body
    ? `<section class="section-${id}" aria-labelledby="${id}-title">
  <h2 id="${id}-title">${e(title)}</h2>
  <div class="body">
${body}
  </div>
</section>`
    : '';

// Highlights past `pdfHighlights` are marked web-only, which the print styles hide.
const webOnly = (hidden: boolean) => (hidden ? ' class="web-only"' : '');

const entry = (
  { title, org, context, url, startDate, endDate, summary, highlights = [], pdfHighlights = highlights.length, webOnly: entryWebOnly }: Entry,
  locale: Locale,
) =>
  `<article class="entry${entryWebOnly ? ' web-only' : ''}">
  <div class="entry-head">
    <h3>${e(title)}${org ? ` <span class="org"><span class="sep">· </span>${url ? link(url, org) : e(org)}${context ? ` <span class="note">${e(context)}</span>` : ''}</span>` : ''}</h3>
    ${startDate ? `<p class="dates">${dateRange(startDate, endDate, locale)}</p>` : ''}
  </div>
  ${summary ? `<p>${e(summary)}</p>` : ''}
  ${highlights.length ? `<ul${webOnly(pdfHighlights === 0)}>${highlights.map((item, index) => `<li${webOnly(index >= pdfHighlights)}>${e(item)}</li>`).join('')}</ul>` : ''}
</article>`;

const entries = <T>(items: T[], toEntry: (item: T) => Entry, locale: Locale) =>
  items.map((item) => entry(toEntry(item), locale)).join('\n');

const pairs = (items: Pair[]) =>
  items.length
    ? `<dl class="pairs">
${items.map(({ term, note, detail }) => `  <div><dt>${e(term)}${note ? ` <span class="note">${e(note)}</span>` : ''}</dt><dd>${e(detail)}</dd></div>`).join('\n')}
</dl>`
    : '';

const contact = ({ location, email, phone, url, profiles = [] }: Basics) => {
  const items = [
    e(place(location)),
    email && link(`mailto:${email}`, email),
    phone && link(`tel:${phone.replace(/[^+\d]/g, '')}`, phone),
    url && link(url, displayUrl(url)),
    ...profiles.map(
      ({ network, username, url: profileUrl }) =>
        `<a href="${e(profileUrl)}"><span class="note">${e(network)}</span> ${e(username)}</a>`,
    ),
  ];
  return `<ul class="contact">${items.filter(Boolean).map((item) => `<li>${item}</li>`).join('')}</ul>`;
};

// Named after the person, so a PDF saved from the browser's viewer keeps a useful name.
export const pdfFileName = (resume: Resume, locale: Locale): string =>
  `${slugify(resume.basics.name)}-${locale.code}.pdf`;

const controls = (resume: Resume, locale: Locale) =>
  `<nav class="controls" aria-label="${e(locale.labels.language)}">
    <span class="lang">${Object.values(locales)
      .map((other) =>
        other === locale
          ? `<a href="./" lang="${other.code}" aria-current="page" title="${e(other.name)}">${other.short}</a>`
          : `<a href="${locale.root + other.path || './'}" lang="${other.code}" hreflang="${other.code}" title="${e(other.name)}">${other.short}</a>`,
      )
      .join('')}</span>
    <a class="pdf" href="${locale.root}${pdfFileName(resume, locale)}" target="_blank" type="application/pdf">${e(locale.labels.viewPdf)}</a>
  </nav>`;

const fontFace = (root: string) => `@font-face {
  font-family: "Inter Variable";
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url("${root}fonts/inter.woff2") format("woff2");
}`;

// Escaping `<` keeps resume text from closing the surrounding <script> element.
const jsonLd = (basics: Basics, pageUrl: string) =>
  JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: basics.name,
    jobTitle: basics.label,
    description: basics.summary,
    email: basics.email,
    address: place(basics.location) || undefined,
    url: pageUrl,
    sameAs: [basics.url, ...(basics.profiles ?? []).map((profile) => profile.url)].filter(Boolean),
  }).replace(/</g, '\\u003c');

const seo = (basics: Basics, locale: Locale, siteUrl: string) => {
  const pageUrl = (target: Locale) => `${siteUrl}/${target.path}`;
  const title = `${basics.name} — ${basics.label}`;
  const description = truncate(basics.summary ?? title);
  const others = Object.values(locales).filter((other) => other !== locale);

  return `<meta name="description" content="${e(description)}">
<link rel="canonical" href="${e(pageUrl(locale))}">
${Object.values(locales)
  .map((other) => `<link rel="alternate" hreflang="${other.code}" href="${e(pageUrl(other))}">`)
  .join('\n')}
<link rel="alternate" hreflang="x-default" href="${e(pageUrl(defaultLocale))}">
<meta property="og:type" content="profile">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(description)}">
<meta property="og:url" content="${e(pageUrl(locale))}">
<meta property="og:image" content="${e(siteUrl)}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${locale.ogLocale}">
${others.map((other) => `<meta property="og:locale:alternate" content="${other.ogLocale}">`).join('\n')}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${jsonLd(basics, pageUrl(locale))}</script>`;
};

export const favicon = (name: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2348c5"/><text x="32" y="33" fill="#fff" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="28" font-weight="700" text-anchor="middle" dominant-baseline="central">${e(initials(name))}</text></svg>
`;

// 1200x630 card screenshotted into og.png, the image shown when the resume link is shared.
export function shareCard({ basics }: Resume, { css = '', siteUrl = '' }: Site = {}): string {
  const footer = [displayUrl(siteUrl), place(basics.location)].filter(Boolean).join(' · ');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
${fontFace('')}
${css}
body {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 1200px;
  height: 630px;
  padding: 72px 88px;
}
.mark {
  display: grid;
  place-items: center;
  width: 88px;
  height: 88px;
  border-radius: 20px;
  background: var(--accent);
  color: var(--bg);
  font-size: 38px;
  font-weight: 700;
}
h1 {
  margin: 0;
  font-size: 92px;
  font-weight: 750;
  line-height: 1.05;
  letter-spacing: -0.035em;
}
.label {
  margin: 16px 0 0;
  font-size: 42px;
}
.footer {
  margin: 0;
  color: var(--muted);
  font-size: 28px;
}
</style>
</head>
<body>
<div class="mark">${e(initials(basics.name))}</div>
<div>
  <h1>${e(basics.name)}</h1>
  <p class="label">${e(basics.label)}</p>
</div>
<p class="footer">${e(footer)}</p>
</body>
</html>
`;
}

export function render(resume: Resume, locale: Locale, { css = '', siteUrl = '' }: Site = {}): string {
  const { basics, work = [], volunteer = [], education = [], skills = [], languages = [], interests = [], references = [] } = resume;
  const { labels } = locale;

  // On screen the two columns are invisible wrappers; the PDF lays them out side by side.
  const column = (name: string, parts: string[]) => {
    const content = parts.filter(Boolean).join('\n');
    return content && `<div class="${name}">\n${content}\n</div>`;
  };

  const [summarySection, workSection, volunteerSection, educationSection, skillsSection, languagesSection, interestsSection, referencesSection] = [
    section('summary', labels.summary, basics.summary && `<p>${e(basics.summary)}</p>`),
    section(
      'work',
      labels.work,
      entries(
        work,
        ({ position, name, description, location, ...rest }) => ({
          ...rest,
          title: position,
          org: name,
          context: [description, location].filter(Boolean).join(', '),
        }),
        locale,
      ),
    ),
    section(
      'volunteer',
      labels.volunteer,
      entries(volunteer, ({ position, organization, ...rest }) => ({ ...rest, title: position, org: organization }), locale),
    ),
    section(
      'education',
      labels.education,
      entries(education, ({ studyType, institution, area, ...rest }) => ({ ...rest, title: studyType, org: institution, summary: area }), locale),
    ),
    section(
      'skills',
      labels.skills,
      pairs(skills.map(({ name, level, keywords = [] }) => ({ term: name, note: level && (labels.levels[level] ?? level), detail: keywords.join(' · ') }))),
    ),
    section('languages', labels.languages, pairs(languages.map(({ language, fluency }) => ({ term: language, detail: fluency })))),
    section('interests', labels.interests, pairs(interests.map(({ name, keywords = [] }) => ({ term: name, detail: keywords.join(' · ') })))),
    section(
      'references',
      labels.references,
      references
        .map(({ name, reference }) => `<figure class="quote"><blockquote><p>${e(reference)}</p></blockquote><figcaption>${e(name)}</figcaption></figure>`)
        .join('\n'),
    ),
  ];

  const sections = [
    summarySection,
    column('main-col', [workSection, volunteerSection]),
    column('side-col', [educationSection, skillsSection, languagesSection, interestsSection]),
    referencesSection,
  ];

  return `<!doctype html>
<html lang="${locale.code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(basics.name)} — ${e(basics.label)}</title>
${seo(basics, locale, siteUrl)}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff">
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#101317">
<link rel="icon" href="${locale.root}favicon.svg" type="image/svg+xml">
<link rel="preload" href="${locale.root}fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<style>
${fontFace(locale.root)}
${css}</style>
</head>
<body>
<div class="page">
<header class="masthead">
  ${controls(resume, locale)}
  <h1>${e(basics.name)}</h1>
  <p class="label">${e(basics.label)}</p>
  ${contact(basics)}
</header>
<main>
${sections.filter(Boolean).join('\n')}
</main>
</div>
</body>
</html>
`;
}
