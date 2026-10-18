AEC ARTS PRIVATE SHARED CATALOGUE — GITHUB ROOT PACKAGE v15 — PRIVATE PREVIEW + ASSET ISOLATION
==========================================================

PURPOSE
A private product-management workspace for the owner and business partner. It is separate from the public AEC Arts shop. It does not publish the customer storefront or process payments.

WHY THIS PACKAGE IS FLAT
Every file required for deployment is at the repository root because GitHub's web uploader did not preserve the intended folders in the earlier upload. No hidden file needs to be selected manually. `prepare-assets.mjs` recreates a dedicated `public/` directory during each build and copies only `index.html` into it. Wrangler is configured to publish only `public/`; the repository root is never used as the static asset directory. The Worker code, SQL, tests, configuration and documentation are not published as public files.

WHAT IS INCLUDED
- Owner and partner sign-in identities.
- Server-verified signed sessions in Secure, HttpOnly, SameSite=Strict cookies.
- Shared catalogue in Cloudflare D1: add/edit/delete products, categories, prices, descriptions and images.
- CSV import/export and stale-save protection.
- Authenticated `/preview` route: read-only storefront preview uses the same shared catalogue and has no checkout.
- Build-time public asset allow-list: only `public/index.html` is published; repository root is not an asset directory.
- A4/A3 print category suggestions and suggested categories for canvases and healing pads.
- Private API, same-origin checks, login-attempt throttling, input validation and response security headers.
- Worker tests and SQL schema.

DEPLOYMENT FILES (ALL AT ROOT)
- worker.js — private API and session logic
- index.html — private workspace interface
- wrangler.toml — Worker, assets and D1 configuration
- package.json — reproducible Wrangler dependency and commands
- prepare-assets.mjs — recreates `public/` and copies only `index.html` during deployment
- schema.sql and 0001_private_catalogue.sql — database schema copies
- worker.test.mjs — local Worker tests
- AEC_Arts_Shop_v10_Image_Zoom_Tagline.html — standalone shop-template reference only
- NEXT_SESSION_CLOUDFLARE_SETUP.txt — deployment checklist

DATABASE
The Wrangler config points to the existing D1 database `aec-arts-private-catalogue` (ID already configured in wrangler.toml). Do not replace that ID and do not connect this project to Mon-Gen. Schema creation uses `CREATE TABLE IF NOT EXISTS` and can be safely re-run.

DEPLOYMENT ORDER
1. Upload the extracted ZIP's individual files to the existing private GitHub repository root, not the ZIP itself. When prompted, allow files with matching names to replace the current versions. No hidden file needs manual selection. Leave unrelated existing repository files alone; Wrangler now publishes only the generated `public/` directory, never the repository root.
2. In Cloudflare Workers & Pages, connect the private repository to the Worker named `aec-arts-private-workspace`. Do not attach a custom domain or route for the public shop.
3. Configure the build/deploy command as `npm run deploy` in a standard Node/npm Workers Builds environment. `npm install` must run first so the pinned Wrangler dependency is installed. The deploy script recreates `public/` with only `index.html`, applies the idempotent schema to the configured D1 database, then deploys the Worker and its HTML asset.
4. Add these Worker secrets in Cloudflare settings: `AEC_OWNER_PASSWORD`, `AEC_PARTNER_PASSWORD`, and `AEC_SESSION_SECRET`. Use different strong owner/partner passwords and a long random session secret. Never commit secrets to GitHub or paste them into chat.
5. Confirm build logs show asset preparation, database schema setup and Worker deployment success. Open the assigned HTTPS workers.dev URL.
6. Verify bad password rejection; owner login; partner login in a separate browser/device; product creation on one device appears after refresh on the other; edits sync back; sign-out clears the session. Delete the test product after verification.
7. Only after those tests pass, export a backup of the current catalogue and import it once. Import replaces the shared catalogue, so keep the backup and verify product count/categories afterward.

STATUS AND LIMITS
This is a locally tested deployment package, not a live deployed workspace. The eight Worker tests passed locally, including authenticated preview routing. Live login, D1 writes, two-device sharing, private preview in a real browser and sign-out still require deployment and browser verification. Do not use it for daily catalogue work until those checks pass. It does not alter Shopify, Stripe, public AEC Arts pages, service sites or Mon-Gen resources.

LOCAL TESTS
Run `npm test` in a Node.js environment. Local test success is not proof of a live deployment.
