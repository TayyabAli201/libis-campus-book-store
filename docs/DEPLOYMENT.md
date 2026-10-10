# Setup and deployment

## Runtime configuration

| Name / binding       | Required          | Purpose                                                                         |
| -------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `DB`                 | Yes               | D1 relational database. Logical name in `.openai/hosting.json`.                 |
| `BUCKET`             | Yes               | R2 object storage. Proof objects remain private.                                |
| `APP_ORIGIN`         | Yes in production | Trusted canonical HTTPS origin for sitemap and metadata.                        |
| `BOOTSTRAP_EMAIL`    | At initialization | Initial administrator email. Defaults to the specified admin email.             |
| `BOOTSTRAP_PASSWORD` | At initialization | Secret temporary password. Hashed with scrypt before storage.                   |
| `BOOTSTRAP_TOKEN`    | At initialization | At least 32 random bytes in a secret string; authorizes the one-time setup API. |
| `OCR_API_URL`        | Optional          | HTTPS endpoint implementing `docs/OCR.md`.                                      |
| `OCR_API_KEY`        | Optional secret   | Bearer key sent only by the server to the configured OCR endpoint.              |

There is no JWT signing key: sessions are 256-bit random opaque tokens, with hashes stored in D1. Storage credentials are provided by Worker bindings, never exposed to JavaScript. Bank account details are intentionally displayed as transfer instructions; they are not bank API credentials. No email or WhatsApp Business API key is needed for the implemented click-to-chat workflow.

Local values belong in ignored `.dev.vars`; `.env.example` documents the supported keys. Hosted values belong in the host's secret/environment settings. Empty OCR configuration is supported and gives a clear manual-review result.

## Sites deployment

The workspace is registered to the Site identity in `.openai/hosting.json`. Sites provisions the logical D1/R2 resources, applies the committed Drizzle schema migrations and runs the built Worker. Publish through the Sites workflow, retaining that identity. Do not paste resource IDs or secrets into the hosting manifest.

After the first successful deployment, initialize the fresh database with an authenticated `POST /api/setup` and `Authorization: Bearer <BOOTSTRAP_TOKEN>`. A private Site additionally needs its existing platform service credential in `OAI-Sites-Authorization`, or a signed-in owner browser. These are separate boundaries. Setup runs once; subsequent calls return conflict.

Sign in at `/admin/login`, change the temporary password, create campuses and staff accounts, set Student prices and support details, and verify the bank instructions. Remove `BOOTSTRAP_PASSWORD` and `BOOTSTRAP_TOKEN` from hosted environment settings and deploy the same saved version again. Database initialization cannot reset an existing admin.

New Sites remain owner-private until the owner chooses an audience. Private publication is suitable for review; public student access requires an explicit sharing/access-policy change by the owner. App passwords and RBAC continue to protect staff portals regardless of the outer platform audience.

## Vercel deployment

The Vercel path uses native Next.js, a remote Turso/libSQL database and a **private** Vercel Blob store. `vercel.json` selects the Next.js framework, `npm ci`, `npm run build:vercel` and `.next`. The build verifies that `.next/routes-manifest.json` exists. The default `npm run build` also selects this path when Vercel sets `VERCEL=1`; Cloudflare builds still use Vinext otherwise. Use Node.js **24.x** in project settings.

The former missing-manifest error came from running `vinext build` under Vercel's Next.js preset: it produced a Worker in `dist/server` instead of `.next`. Do not change the output directory to `dist` to work around it. The runtime alias now supplies database and storage adapters appropriate to each host.

### Provision and connect resources

1. In the existing Vercel project, connect a Turso database through Storage / Marketplace. Choose an appropriate free plan if available; do not enable paid add-ons unintentionally. This provides `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the selected environments.
2. Create and connect a Vercel Blob store with **private access**. It supplies `BLOB_READ_WRITE_TOKEN` (or a configured `BLOB_STORE_ID` with Vercel OIDC). Payment proofs are served only through the app's authorized API; cover images use the public cover API.
3. Set `APP_ORIGIN` to the production HTTPS website origin, `BOOTSTRAP_EMAIL`, a fresh temporary `BOOTSTRAP_PASSWORD` and a random `BOOTSTRAP_TOKEN` of at least 32 bytes. Never use previously exposed local bootstrap secrets. Optional OCR variables work on both hosts.
4. Run `npm run db:migrate:vercel` with the database environment variables supplied securely, for example in ignored `.env.local`. This applies the committed migrations in order, records checksums and skips previously applied migrations. Run it before the first deployment that serves requests and before schema upgrades. Do not run it against an existing imported database without first reconciling its migration history.
5. Deploy the updated commit. Initialize a **fresh** database once using `node --env-file=.env.local scripts/bootstrap.mjs`, with `APP_ORIGIN` and `BOOTSTRAP_TOKEN` matching the deployment. Protected Vercel preview deployments also require their platform access mechanism; app bootstrap authorization does not bypass deployment protection.
6. Sign in at `/admin/login`, change the temporary password, configure the bookstore's real bank/support details and import the catalog Excel file. Remove bootstrap password/token variables and redeploy. Existing database accounts cannot be reset using the setup endpoint.

Preview deployments should use a separate database and Blob store when testing mutations. Never point a disposable test script at production. Database content and existing local proof uploads are not transferred by a Git push or Vercel deployment; plan their migration separately if preserving local records is required.

### Validate the build locally

```sh
npm test
npm run build:vercel
node scripts/verify-vercel.mjs
```

The smoke test creates its own temporary libSQL database and server, uses synthetic orders and removes its test database afterward. It checks initialization, login, catalog, quote, checkout, Order ID tracking, pending counts, confirmation and authorized receipts. Private Blob operations are unit-tested with a substitute service; verify actual upload/download with the connected Blob store after deployment. This test does not contact Turso or Vercel Blob.

Run Cloudflare and Next.js builds sequentially. Vinext and Next.js both generate `.next/types/routes.d.ts`; stop the local Vinext watcher before a native Next.js build if it is regenerating that file concurrently. For native development use `npm run dev:vercel` with the same Turso variables in `.env.local`.

Vercel uploads are capped at 4 MB to stay within its Function body limit. The UI and server agree on this limit. The database adapter preserves atomic batch rollback for checkout/payment guards. HTTPS session cookies, CSRF origins and client-IP rate limits are configured for Vercel's proxy. Set `APP_ORIGIN` when assigning a custom domain so same-origin form requests remain accepted.

## Source control and secrets

Local `.dev.vars`, `.wrangler` and `.sites-runtime` files must remain outside Git. If they were already pushed, removing them in a later commit does not erase earlier copies; rotate exposed secrets and address repository history separately. Keep working database and proof files locally while removing them from version control.

## Standalone Cloudflare deployment

1. Install dependencies and run `npm run build`.
2. Provision your own D1 database and private R2 bucket using your Cloudflare account.
3. Set `CF_DATABASE_ID`, `CF_BUCKET_NAME`, `APP_ORIGIN`, and optionally `CF_WORKER_NAME`. Run `node scripts/configure-cloudflare.mjs`.
4. Review `.deployment/wrangler.json`. It points at the existing build and your chosen resources. Do not use the local placeholder database ID for production.
5. Apply each migration to your new remote DB, once and in order:

   ```sh
   npx wrangler d1 execute DB --remote --config .deployment/wrangler.json --file drizzle/0000_modern_marrow.sql
   npx wrangler d1 execute DB --remote --config .deployment/wrangler.json --file drizzle/0001_swift_scream.sql
   npx wrangler d1 execute DB --remote --config .deployment/wrangler.json --file drizzle/0002_bizarre_thena.sql
   npx wrangler d1 execute DB --remote --config .deployment/wrangler.json --file drizzle/0003_clear_book_catalog.sql
   ```

6. Set bootstrap secrets with `npx wrangler secret put BOOTSTRAP_PASSWORD --config .deployment/wrangler.json` and `npx wrangler secret put BOOTSTRAP_TOKEN --config .deployment/wrangler.json`. Set `BOOTSTRAP_EMAIL` if changing the default.
7. Deploy using `npx wrangler deploy --config .deployment/wrangler.json`.
8. Run the one-time bootstrap against your origin, rotate the temporary admin password, and remove bootstrap secrets. Configure OCR separately when ready.

This standalone route uses the Worker runtime and requires your own Cloudflare account. For Vercel, use the Next.js/Turso/Blob route above.

## Schema and upgrades

Edit `db/schema.ts`, run `npm run db:generate`, and inspect the generated SQL before deployment. Keep all applied migrations and Drizzle metadata immutable. Back up D1 and R2 before a production migration, and verify restore procedures. A rolled-back Worker does not automatically roll back its database schema.

## Operations before accepting live orders

- Replace seed catalog content and confirm Student per-page prices.
- Confirm the bank account, WhatsApp number, support email/hours, delivery charges and policy text.
- Review all pending-payment orders; reject or cancel abandoned orders deliberately.
- Configure OCR if desired, then test real permitted sample slips for exact, low, high, ambiguous and failed extraction.
- Verify an actual bank transfer manually before approving any payment.
- Set host-level request limits, monitoring and a backup/retention process appropriate to expected traffic.
- Perform workload tests and independent security review before a public commercial launch. The automated suite is functional verification, not a penetration test or capacity certification.

## Retention

Orders, proofs, audit records and movement history are retained for accountability. No automatic destructive retention policy is installed. Establish the legally/business-appropriate retention period before production. Expired sessions are pruned at login; expired rate counters, unused quotes and orphan uploads can be removed by an operator after checking foreign-key references. Keep proof files for any disputed or pending order.


## Vercel commit ownership

For a private repository on a Vercel Hobby team, deployment commits must belong to the team owner. A deployment marked Blocked before the build starts can mean the Git author is associated with a different GitHub account. Configure this repository with the owner account’s verified GitHub email (or its GitHub-provided noreply address), then create a new owner-authored commit. Existing commit history does not need to be rewritten.
