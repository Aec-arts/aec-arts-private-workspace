import { mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Publish a dedicated, freshly-created directory containing only the HTML shell.
// Wrangler must never point at the repository root: that could expose source,
// tests, SQL, configuration, or the standalone shop-template reference.
const publicDir = resolve('public');
await rm(publicDir, { recursive: true, force: true });
await mkdir(publicDir, { recursive: true });
await copyFile(resolve('index.html'), resolve(publicDir, 'index.html'));
console.log('Prepared public asset directory: public/index.html only.');
