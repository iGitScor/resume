import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import { defaultLocale, locales } from '../src/i18n.ts';
import { pdfFileName, shareCard } from '../src/template.ts';
import { distDir, loadResume, loadSite } from './build.ts';
import { serve } from './serve.ts';

// Renders the built pages, so `npm run build` has to run first.
const { server, url } = await serve(distDir);
const browser = await chromium.launch();
const written: string[] = [];

try {
  const page = await browser.newPage();

  for (const locale of Object.values(locales)) {
    const response = await page.goto(`${url}/${locale.path}`);
    if (!response?.ok()) throw new Error(`dist/${locale.path}index.html is missing, run "npm run build" first`);
    await page.evaluate(() => document.fonts.ready);

    const path = join(distDir, pdfFileName(await loadResume(locale), locale));
    await page.pdf({ path, preferCSSPageSize: true, printBackground: true });
    written.push(path);
  }

  // The card is set on a page already at the site root, so its font URL resolves.
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.goto(`${url}/`);
  await page.setContent(shareCard(await loadResume(defaultLocale), await loadSite()));
  await page.evaluate(() => document.fonts.ready);

  const path = join(distDir, 'og.png');
  await page.screenshot({ path });
  written.push(path);
} finally {
  await browser.close();
  server.close();
}

console.log(`Generated ${written.map((path) => relative(process.cwd(), path)).join(', ')}`);
