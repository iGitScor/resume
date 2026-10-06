import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { defaultLocale, locales, type Locale } from '../src/i18n.ts';
import { favicon, render } from '../src/template.ts';
import type { Resume, Site } from '../src/types.ts';

export const root = join(import.meta.dirname, '..');
export const distDir = join(root, 'dist');

const fontPackage = 'node_modules/@fontsource-variable/inter';
const font = `${fontPackage}/files/inter-latin-wght-normal.woff2`;
const readJson = async (...path: string[]) => JSON.parse(await readFile(join(root, ...path), 'utf8'));

export const loadResume = (locale: Locale): Promise<Resume> => readJson('src', locale.code, 'resume.json');

// The public URL comes from `homepage` in package.json.
export async function loadSite(): Promise<Required<Site>> {
  const [{ homepage }, css] = await Promise.all([
    readJson('package.json') as Promise<{ homepage: string }>,
    readFile(join(root, 'src', 'styles.css'), 'utf8'),
  ]);
  return { css, siteUrl: homepage.replace(/\/$/, '') };
}

export async function build(outDir = distDir): Promise<string> {
  const site = await loadSite();

  await mkdir(join(outDir, 'fonts'), { recursive: true });
  await copyFile(join(root, font), join(outDir, 'fonts', 'inter.woff2'));
  // The SIL Open Font License asks for the license to travel with the font.
  await copyFile(join(root, fontPackage, 'LICENSE'), join(outDir, 'fonts', 'LICENSE.txt'));

  for (const locale of Object.values(locales)) {
    const resume = await loadResume(locale);
    await mkdir(join(outDir, locale.path), { recursive: true });
    await writeFile(join(outDir, locale.path, 'index.html'), render(resume, locale, site));
    if (locale === defaultLocale) await writeFile(join(outDir, 'favicon.svg'), favicon(resume.basics.name));
  }

  return outDir;
}

if (process.argv[1] === import.meta.filename) {
  const outDir = await build();
  console.log(`Resume built in ${relative(process.cwd(), outDir)}/`);
}
