# Campus Bookstore

A working university bookstore with a student storefront, campus portal and Super Admin portal. Built from the supplied Campus Bookstore specification.

## Run locally

Use Node.js 24 LTS. The test suite uses Node's built-in SQLite and TypeScript support.

```sh
npm ci
```

Copy `.env.example` to `.dev.vars`. Set a random `BOOTSTRAP_TOKEN`, the initial administrator email, and a temporary `BOOTSTRAP_PASSWORD`. Use the initial password supplied privately in the specification if reproducing that setup; it is deliberately absent from source and documentation. Never commit `.dev.vars`.

```sh
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_modern_marrow.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_swift_scream.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_bizarre_thena.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0003_clear_book_catalog.sql
npm run dev
```

Apply each migration once, in filename order, on a fresh database. Do not replay an already-applied migration. Keep the development server running, then in a second terminal:

```sh
node --env-file=.dev.vars scripts/bootstrap.mjs
```

Open the URL printed by the development server (normally `http://127.0.0.1:5173`). Fresh source downloads do not include `.dev.vars` or the local database, so complete both the migration and bootstrap steps above before opening the storefront. Keep `.wrangler/state` between runs; do not replay the initial migration on an existing database.

| Experience               | Route                    |
| ------------------------ | ------------------------ |
| Student storefront       | `/`                      |
| Catalog and book details | `/books`, `/books/cs101` |
| Cart and checkout        | `/cart`, `/checkout`     |
| Order ID tracking        | `/orders`                |
| Campus login             | `/campus/login`          |
| Super Admin login        | `/admin/login`           |

The seeded admin email is `admin@campusbookstore.com`. First login requires changing the temporary password. Campus logins are created under **User accounts** after a campus is created. No student signup is necessary. Order status, book summaries and totals are available using only the Order ID. Customer details, receipts and replacement-proof uploads require the ordering device's HttpOnly cookie or the appropriate staff access.

## What works

- Search by book code, course code, title or course name; course browsing, detail URLs and live price calculation.
- Persistent device cart; quantities without stock limits, server-priced checkout, delivery review and bank instructions with copy action.
- Secure JPG/PNG/PDF proof uploads with upload progress, configurable limits, signature checks, private object storage, OCR adapter and manual fallback.
- Transactional order creation, quote idempotency, payment decisions, fulfilment state machine, cancellation and refund-request recording.
- Simple Order ID search without device history or copy-link controls; replacement-proof requests on the ordering device, order timeline, professional A4 print layout and PDF receipt download with repeated headers, footers and page numbers.
- Super Admin Orders badge shows the all-time pending count, refreshes every 15 seconds while visible and immediately after an order decision, and disappears when no orders await confirmation.
- Book create/edit/archive, homepage On/Off controls, cover upload, category and fixed-price override, Excel .xlsx import with row results and Excel export with essential columns.
- Clear data removes the entire catalog after a total-count review and typed confirmation, preserving historic order and receipt records. The same book codes can be imported again.
- Four editable rates: A, B, C and Student category (D), optimistic concurrency, confirmation and price history.
- Campus creation/edit/disable/delete, scoped permissions, campus orders/activity, staff creation/disable/password reset, profile and session revocation.
- Payment verification queue, OCR amount/difference, approval/rejection/new-slip/manual-review actions, private admin notes, searchable/date-filtered orders.
- Sales/order/catalog metrics, six charts, date ranges, reports export, scoped student lists, centralized settings and audit logs.
- Interactive 3D book previews with drag/touch rotation, opening covers, featured-book selection and keyboard controls; floating books, catalog tilt, scroll reveals, light/dark/system themes and reduced-motion support.
- Server-rendered homepage and book details, metadata, Book/Offer structured data, sitemap, robots rules, favicon and public policies.

## Architecture

React 19 and TypeScript use App Router conventions. Vercel uses native Next.js with Turso/libSQL for the database and private Vercel Blob for uploads; `vercel.json` selects `npm run build:vercel` and the `.next` output. The existing local preview and Cloudflare build continue to use Vinext, D1 and R2. Tailwind 4, Radix/Shadcn primitives and Recharts provide the interface. See [deployment setup](docs/DEPLOYMENT.md) for environment variables, migrations and initialization.

```
app/                       Routes, SEO and API entrypoint
components/store.tsx       Storefront, cart, checkout and tracking
components/portal.tsx      Staff portals and management forms
components/report-charts   Lazy-loaded report charts
lib/contracts.ts           Shared validation, money and status rules
lib/server/                Auth, queries, orders, uploads, OCR, receipts, reports
db/schema.ts               Relational schema (Drizzle)
drizzle/                   Generated, versioned schema migrations
tests/                     Domain/database and live local API tests
docs/                      Deployment, security, OCR and requirement notes
```

Cloudflare D1 holds users, campuses, books, pricing, inventory, quotes, orders/items, payment slips/payments, stock/price histories, audit records and rate counters. R2 holds cover images and private payment proof bytes. Queries use bound parameters. Schema changes are managed through migrations, never runtime `CREATE TABLE` calls.

## Student pricing and quantities

All monetary values are integer **paisa**. `250` means PKR 2.50. Every storefront book and checkout line uses `fixed_price ?? pages × Student category.rate`. Student category retains the database key D; A/B/C rates remain reference values. Browser totals are ignored. Submitted orders retain immutable line-price and store-setting snapshots. Fixed-price overrides remain supported.

Stock tracking is disabled. Books do not require inventory records, and new orders do not reserve or deduct stock. There is no stock-based or 100-copy quantity cap; positive safe integers and safe monetary totals are required. Legacy stock/history data is retained. Old reservations are released when pending orders are approved or rejected. Cancelling a legacy unshipped order closes its previous inventory commitment. Refund requests remain a separate financial review.

All related writes run in a D1 batch transaction. Guard statements abort a whole batch on stale versions, prices, settings or reused verified proof. Existing installations must apply `drizzle/0001_swift_scream.sql` once to remove the previous 100-copy database constraint; the migration copies and preserves order lines.

Excel export contains Book Code, Book Name and Pages for all books matching the current search. Import reads those columns from the first sheet, including the original Books Code / Books Name spelling, and ignores all file prices. It supports up to 2,000 books / 4 MB, validates rows independently and reports original Excel row numbers. Missing pages create inactive drafts; adding pages and activating the book enables Student pricing. Duplicate codes within the workbook are rejected, and existing database codes are skipped. Apply `drizzle/0002_bizarre_thena.sql` once to allow missing page counts in drafts. Excel libraries load only when used.

Apply `drizzle/0003_clear_book_catalog.sql` once for Clear data. Cleared records retain their order links but are excluded from the public catalog, management list and book counts. Codes remain unique within the current catalog. Stale edits cannot reactivate cleared records.

## Tests

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
npm audit --omit=dev
```

Integration tests require the initialized local server and `.dev.vars`. They refuse non-loopback origins, create clearly marked QA campuses/accounts/orders, and exercise real D1/R2/API behavior. They rotate the **local** initial admin password and store it only in ignored `.sites-runtime/test-admin.json`. They do not touch the deployed database. Do not run them against a database containing live customer orders. Repeated runs within the rate-limit window can intentionally hit throttling; use a fresh test database or wait for expiry.

Tests cover auth/RBAC and tenant boundaries, server pricing, overselling, idempotency, bad uploads, manual OCR fallback, payment approval, cancellation, receipts, audit records and stale quotes. See `docs/VERIFICATION.md` for the verified result and remaining external checks.

## Production setup

See `docs/DEPLOYMENT.md` and `docs/SECURITY.md`. The seed catalog is explicitly illustrative; replace descriptions, editions, authors and covers with approved catalog details before accepting customer orders. The supplied WhatsApp value is preserved exactly, but appears shorter than a normal Pakistani mobile number; verify it in Settings before public launch. Email and support-hours placeholders also need final values.

OCR is integration-ready and uses manual review until credentials are configured. No live bank verification, funds transfer, courier API, email delivery, or WhatsApp Business API is simulated. The floating WhatsApp button is a configurable click-to-chat link.
