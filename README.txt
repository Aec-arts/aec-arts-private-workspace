AEC ARTS PRIVATE SHARED CATALOGUE — BUILD v11
============================================

WHAT THIS IS
A private product-management workspace for the owner and business partner. It is not the public AEC Arts shop and has no public storefront or live checkout. Both authorised users work on the same catalogue stored in Cloudflare D1.

FEATURES IN THIS BUILD
- Separate Owner and Business partner sign-in identities.
- Server-verified sessions using signed, HttpOnly, Secure, SameSite=Strict cookies.
- Product list, search, add, edit, delete, categories, prices, descriptions and product images.
- A4 Prints and A3 Prints are suggested as separate categories; print titles containing A4/A3 are automatically assigned during import/add when the category is not manually overridden. One-off Canvases and Healing Pads are also suggested categories.
- CSV catalogue import and export backup.
- Shop template reference v10 includes click-to-enlarge product photography, hover zoom on desktop, a mobile-friendly enlarged product detail view, and the tagline “where art meets wellness”.
- Shared changes are saved to one database.
- Stale-save protection: if the other user saves after you loaded the catalogue, your save is blocked until you refresh; this prevents silently overwriting their work.
- Basic login-attempt throttling and input validation.
- Private API endpoints, same-origin checks, no-store responses and browser security headers.
- Cloudflare D1 migration/schema included.

IMPORTANT CURRENT STATUS
This is a built deployment package, not yet a live shared website. The code has not been deployed into the user's Cloudflare account and no real sign-in/database test against that account has been possible from this build session. Do not share a URL or use it for real catalogue work until deployment and the two-user verification are completed.

WHAT IT NEEDS TO GO LIVE PRIVATELY
1. A Cloudflare Worker with static assets and a separate D1 database. Use NEXT_SESSION_CLOUDFLARE_SETUP.txt. First create the database in the Cloudflare dashboard, then copy its real ID into the single database_id line in wrangler.toml using GitHub’s web editor. The ID cannot be guessed or automatically inferred from the database name.
2. Set these Worker secrets in Cloudflare (never put them in this file or the HTML):
   - AEC_OWNER_PASSWORD: a strong private password for the owner
   - AEC_PARTNER_PASSWORD: a different strong private password for the partner
   - AEC_SESSION_SECRET: a long random secret used to sign sessions
3. Apply the included migration and deploy the Worker plus public/ assets. The package includes a Cloudflare Workers Builds deploy script for this step. The first deployment must not run until the database_id placeholder has been replaced with the real ID.
4. Open the resulting HTTPS URL, sign in as both users on separate browsers/devices, add/edit a test product, refresh the other browser, and verify it appears there. Also test bad passwords and sign-out.

DEPLOYMENT FILES
- worker.js: API, login/session verification, catalogue validation, stale-write protection.
- public/index.html: private workspace interface.
- migrations/0001_private_catalogue.sql: D1 schema.
- wrangler.toml: deployment configuration with one database ID placeholder.
- schema.sql: readable copy of the schema.
- reference/AEC_Arts_Shop_v10_Image_Zoom_Tagline.html: updated standalone shop template reference, kept outside the private workspace public assets folder. The separate shop template is still a local test build; it is not the shared/private catalogue app and does not take live payments.

CATALOGUE MIGRATION
The workspace can import the CSV exported from v7. In v7, choose Export catalogue and save the CSV. Once the private workspace is deployed and signed in, choose Import catalogue CSV. Import replaces the shared catalogue, so export a backup first and import only once. Shopify CSV variant rows are grouped by product handle where possible.

IMAGE NOTE
Small image files can be stored in the shared catalogue, but this is intentionally limited to keep the database payload safe. Prefer image URLs for larger product photography. Total saved catalogue payload has a limit; if it is exceeded, reduce image sizes or use image URLs.

SECURITY / LIMITS
- The HTML shell itself is served publicly, but catalogue data and management API calls require successful sign-in. No product data is embedded in the HTML shell.
- User identities are fixed as owner and partner; passwords are supplied as Cloudflare secrets.
- This is a private product catalogue workspace only. It does not process payments, take customer orders, publish the store, or alter existing AEC Arts / Shopify / Stripe settings.
- The catalogue uses a single shared revision. When another user saves, the other user's unsaved stale view must refresh before saving. It does not silently merge simultaneous edits.

LOCAL CHECKS
Run Node.js syntax checks on worker.js and the browser script, inspect the migration and ZIP integrity, then perform the live two-browser test after deployment. Passing local checks is not evidence of a live deployment.
