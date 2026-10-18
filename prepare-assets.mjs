import { writeFile } from 'node:fs/promises';

// Cloudflare Wrangler reads .assetsignore from the configured asset directory.
// Generate it during the build so Windows' hidden-file handling cannot omit it
// from a GitHub web upload. Only the private workspace HTML shell is public.
await writeFile('.assetsignore', '*\n!index.html\n', { encoding: 'utf8' });
console.log('Prepared static asset allow-list: index.html only.');
