import { build } from './build.ts';
import { serve } from './serve.ts';

// Run through `npm run dev`: node restarts this script whenever src/ changes.
const outDir = await build();
const { url } = await serve(outDir, Number(process.env.PORT) || 4173);
console.log(`Resume served at ${url}/ (rebuilds when src/ changes)`);
