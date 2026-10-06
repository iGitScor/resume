import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import resumeSchema from '@jsonresume/schema';
import { build, loadResume } from '../scripts/build.ts';
import { formatDate, locales } from '../src/i18n.ts';
import { escapeHtml, render } from '../src/template.ts';

for (const locale of Object.values(locales)) {
  test(`${locale.code} resume matches the JSON Resume schema`, async () => {
    const resume = await loadResume(locale);
    const errors = await new Promise<string[]>((resolve) => {
      resumeSchema.validate(resume, (validationErrors) => resolve((validationErrors ?? []).map(String)));
    });
    assert.deepEqual(errors, []);
  });
}

test('locales describe the same resume', async () => {
  const [en, fr] = await Promise.all([loadResume(locales.en), loadResume(locales.fr)]);
  for (const section of ['work', 'volunteer', 'education', 'skills', 'languages', 'references'] as const) {
    assert.equal(fr[section]?.length, en[section]?.length, `${section} length differs`);
  }
});

test('dates are formatted per locale and never show the day', () => {
  assert.equal(formatDate('2021-08', locales.en), 'Aug 2021');
  assert.equal(formatDate('2021-08', locales.fr), 'août 2021');
  assert.equal(formatDate('2010-06-20', locales.en), 'Jun 2010');
  assert.equal(formatDate('2008', locales.fr), '2008');
});

test('resume content is escaped', () => {
  assert.equal(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`), '&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;');

  const html = render({ basics: { name: 'A <b>', label: 'B & C', summary: '<script>alert(1)</script>' } }, locales.en);
  assert.ok(html.includes('<h1>A &lt;b&gt;</h1>'));
  assert.ok(!html.includes('<script>alert(1)</script>'));
});

test('a role shows its sector and city after the company', () => {
  const work = [{ name: 'Acme', position: 'Engineer', description: 'Fintech', location: 'Paris' }, { name: 'Other', position: 'Engineer' }];
  const html = render({ basics: { name: 'A', label: 'B' }, work }, locales.en);
  assert.ok(html.includes('<span class="sep">· </span>Acme <span class="note">Fintech, Paris</span></span>'));
  assert.ok(html.includes('<span class="sep">· </span>Other</span>'));
});

test('a period without an employer shows only its title', () => {
  const work = [{ position: 'Career break', startDate: '2023-11', endDate: '2024-12', summary: 'Travel' }];
  const html = render({ basics: { name: 'A', label: 'B' }, work }, locales.en);
  assert.ok(html.includes('<h3>Career break</h3>'));
});

test('each section carries a class, which the print styles use to keep some for the website only', async () => {
  const resume = {
    basics: { name: 'A', label: 'B' },
    interests: [{ name: 'C', keywords: ['D'] }],
    references: [{ name: 'E', reference: 'F' }],
  };
  const html = render(resume, locales.fr);
  assert.ok(html.includes('<section class="section-references"'));
  assert.ok(html.includes('<section class="section-interests"'));

  const css = await readFile(join(import.meta.dirname, '..', 'src', 'styles.css'), 'utf8');
  const [hidden] = css.slice(css.indexOf('@media print')).match(/\.controls,[^{]*\{\s*display: none;/) ?? [''];
  for (const selector of ['.section-references', '.section-interests', '.section-volunteer', '.web-only']) {
    assert.ok(hidden.includes(selector), `${selector} is hidden in print`);
  }
});

test('an entry flagged webOnly is kept for the website only', () => {
  const education = [
    { institution: 'Uni', studyType: 'BSc' },
    { institution: 'Uni', studyType: 'Diploma', webOnly: true },
  ];
  const html = render({ basics: { name: 'A', label: 'B' }, education }, locales.en);
  assert.match(html, /<article class="entry">\s*<div class="entry-head">\s*<h3>BSc/);
  assert.match(html, /<article class="entry web-only">\s*<div class="entry-head">\s*<h3>Diploma/);
});

test('highlights past pdfHighlights are kept for the website only', () => {
  const work = [
    { name: 'Acme', position: 'Engineer', highlights: ['one', 'two', 'three'], pdfHighlights: 2 },
    { name: 'Old', position: 'Engineer', highlights: ['four'], pdfHighlights: 0 },
    { name: 'New', position: 'Engineer', highlights: ['five'] },
  ];
  const html = render({ basics: { name: 'A', label: 'B' }, work }, locales.en);
  assert.ok(html.includes('<ul><li>one</li><li>two</li><li class="web-only">three</li></ul>'));
  assert.ok(html.includes('<ul class="web-only"><li class="web-only">four</li></ul>'));
  assert.ok(html.includes('<ul><li>five</li></ul>'));
});

test('a period within a single year shows that year once', () => {
  const work = [{ position: 'Career break', startDate: '2024', endDate: '2024' }];
  const html = render({ basics: { name: 'A', label: 'B' }, work }, locales.en);
  assert.ok(html.includes('<p class="dates"><time datetime="2024">2024</time></p>'));
});

test('empty sections are left out', () => {
  const html = render({ basics: { name: 'A', label: 'B' }, work: [], skills: [] }, locales.en);
  assert.ok(!html.includes('<section'));
});

test('build writes one page per locale, linked to each other', async (t) => {
  const outDir = await mkdtemp(join(tmpdir(), 'resume-'));
  t.after(() => rm(outDir, { recursive: true }));
  await build(outDir);

  const en = await readFile(join(outDir, 'index.html'), 'utf8');
  const fr = await readFile(join(outDir, 'fr', 'index.html'), 'utf8');

  assert.match(en, /<html lang="en">/);
  assert.match(fr, /<html lang="fr">/);
  assert.match(en, /<a href="fr\/" lang="fr" hreflang="fr"/);
  assert.match(fr, /<a href="\.\.\/" lang="en" hreflang="en"/);
  // The PDF opens in the browser's viewer: no download attribute.
  assert.match(en, /<a class="pdf" href="sebastien-correaud-en\.pdf" target="_blank"/);
  assert.match(fr, /<a class="pdf" href="\.\.\/sebastien-correaud-fr\.pdf" target="_blank"/);
  assert.doesNotMatch(en, / download[=> ]/);

  for (const html of [en, fr]) {
    assert.match(html, /<h1>Sebastien Correaud<\/h1>/);
    assert.doesNotMatch(html, /undefined|\[object Object\]|NaN/);
  }

  await readFile(join(outDir, 'fonts', 'inter.woff2'));
  assert.match(await readFile(join(outDir, 'fonts', 'LICENSE.txt'), 'utf8'), /SIL Open Font License/);
  assert.match(await readFile(join(outDir, 'favicon.svg'), 'utf8'), />SC<\/text>/);
});

test('pages carry canonical, alternate and share metadata', async () => {
  const resume = await loadResume(locales.fr);
  const html = render(resume, locales.fr, { siteUrl: 'https://example.test' });

  assert.match(html, /<link rel="canonical" href="https:\/\/example\.test\/fr\/">/);
  assert.match(html, /<link rel="alternate" hreflang="en" href="https:\/\/example\.test\/">/);
  assert.match(html, /<link rel="alternate" hreflang="x-default" href="https:\/\/example\.test\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/example\.test\/og\.png">/);
  assert.match(html, /<meta property="og:locale" content="fr_FR">/);

  const description = html.match(/<meta name="description" content="([^"]*)">/)![1];
  assert.ok(description.length <= 161, 'description is truncated');

  const person = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1]);
  assert.equal(person['@type'], 'Person');
  assert.equal(person.name, resume.basics.name);
  assert.equal(person.url, 'https://example.test/fr/');
  assert.ok(person.sameAs.includes('https://github.com/iGitScor'));
});
