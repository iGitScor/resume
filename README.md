# Resume

My full resume in the JSON-based [jsonresume.org](https://jsonresume.org) format, published at [cv.iscor.me](https://cv.iscor.me) in English and French.

[![Pages](https://github.com/iGitScor/resume/actions/workflows/pages.yml/badge.svg)](https://github.com/iGitScor/resume/actions/workflows/pages.yml)

## Getting started

Requires Node.js 24 (or 22.18 and later), which runs the TypeScript sources directly: there is no compile step. With nvm, `nvm use` picks the right version.

```
npm ci
npm run dev
```

`npm run dev` serves the resume at http://127.0.0.1:4173/ and rebuilds it whenever a file in `src/` changes.

## Content

Each language has its own file, validated against the JSON Resume schema by `npm test`:

- `src/en/resume.json`, published at `/`
- `src/fr/resume.json`, published at `/fr/`

The page layout lives in `src/template.ts` and `src/styles.css`, section titles and other translated labels in `src/i18n.ts`.

The website shows everything; the PDF is a one-page version. Recommendations, interests and volunteering are left out of it, and two fields that are not part of JSON Resume control the rest:

- `pdfHighlights` on a work entry: how many of its highlights, from the top, appear in the PDF.
- `webOnly: true` on an education entry: shown on the website only.

## Checks

```
npm run typecheck    # TypeScript, no output files
npm test             # schema validation and rendering tests
```

## Build

```
npm run build        # HTML pages in dist/
npm run build:pdf    # PDFs and share image, from the built pages
npm run build:all    # clean, then both
```

The PDFs are rendered with Playwright, which needs its browser once: `npx playwright install --only-shell chromium`.

## Deployment

Every push to `master` runs the type check and tests, builds the site and publishes `dist/` to GitHub Pages through the [Pages workflow](.github/workflows/pages.yml). The custom domain is set in the repository's Pages settings.

## License

The code is released under the [MIT License](LICENSE). The site bundles the [Inter](https://rsms.me/inter/) typeface, licensed under the SIL Open Font License 1.1; its license is published next to the font file.

____

Inspired by [Thibaud Colas](https://github.com/thibaudcolas) -  _[full resume repository](https://github.com/thibaudcolas/fullresume)_
