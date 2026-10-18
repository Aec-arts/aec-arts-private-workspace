AEC ARTS PRIVATE SHARED CATALOGUE — CONSOLIDATED DEPLOYMENT PACKAGE
====================================================================

PURPOSE
A private shared product-management workspace for the owner and business partner. It is separate from the public AEC Arts shop. It does not publish the customer storefront or process payments.

WHAT IS INCLUDED
- Separate owner and partner sign-in identities.
- Server-verified signed sessions in Secure, HttpOnly, SameSite=Strict cookies.
- Shared catalogue stored in Cloudflare D1: add/edit/delete products, categories, prices, descriptions and image URLs or small embedded images.
- CSV import/export and stale-save protection.
- A4 Prints/A3 Prints category suggestions, plus suggested categories for canvases and healing pads.
- Private API, origin checks, login-attempt throttling, validation and response security headers.
- Local worker tests and D1 migration.

IMPORTANT STATUS
This is a deployment-ready package, not a live deployment. The six included Worker tests pass locally. Live login, database writes, two-device sharing, and sign-out still require deployment and real-browser verification. Do not import the real catalogue or use this for daily business work until those checks pass.

STRUCTURE — KEEP THESE FOLDERS
- worker.js
- wrangler.toml
- package.json
- schema.sql
- 0001_private_catalogue.sql
- index.html
- worker.test.mjs
- AEC_Arts_Shop_v10_Image_Zoom_Tagline.html
- app.js (development/reference copy; the deployed UI script is embedded in index.html)

DATABASE
wrangler.toml is already set to the existing D1 database `aec-arts-private-catalogue`. Do not replace the database ID and do not connect this project to Mon-Gen.

DEPLOYMENT ORDER
1. Preserve the existing repository commit. Add this package's files/folders with their directory structure intact. The files under public/, migrations/, tests/, and reference/ must remain in those folders. Do not upload the ZIP itself.
2. In Cloudflare Workers & Pages, connect this repository to a NEW Worker named `aec-arts-private-workspace`. Do not attach a custom domain or route for the public shop.
3. Add these Worker secrets in Cloudflare settings: AEC_OWNER_PASSWORD, AEC_PARTNER_PASSWORD, AEC_SESSION_SECRET. Use unique strong passwords for owner and partner and a long random session secret. Never put secrets in GitHub or chat.
4. Configure the build/deploy command to run `npm run deploy` (with the standard Node/npm environment). This applies the migration to the named D1 database and deploys the Worker and public/ assets. If Cloudflare's actual build screen differs or errors, stop and inspect the exact message rather than guessing.
5. Confirm the deployment log shows migration and deployment success. Open the assigned HTTPS workers.dev URL.
6. Verify: bad password rejected; owner login works; partner login works in another browser/device; a test product added on one device appears after refresh on the other; an edit syncs back; sign-out clears the session. Delete the test product after verification.
7. Only then export a backup of the current catalogue and import it once. Import replaces the shared catalogue, so keep the backup and verify product count/categories afterward.

SECURITY AND SCOPE
The HTML shell can load without signing in, but catalogue data and management API calls require a valid session. No catalogue products are embedded in the HTML shell. Do not publish or share the workspace URL as business-ready until live tests pass. The package does not alter Shopify, Stripe, public AEC Arts pages, service sites, or Mon-Gen resources.

LOCAL TESTS
Run `npm test` in a Node.js environment. Local tests are not proof of live deployment. The included six Worker tests passed during package validation.


ROOT-LAYOUT NOTE: This package intentionally matches the repository layout that GitHub has already accepted: all deployment files are at the repository root. The .assetsignore file ensures only index.html is uploaded as a public static asset; worker source, tests, SQL, configuration and documentation are excluded from the public asset bundle.
