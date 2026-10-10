# Verification record

Verified locally on 3 October 2026 (Asia/Karachi) using Node 24, the real application HTTP routes, Cloudflare's local D1/R2 runtime, and a browser. No payment provider, bank account or external OCR service was contacted by the tests.

## Excel and Student-pricing update

The current change passes all 17 automated tests: 5 domain/schema, 4 authentication, and 8 workbook/order-flow tests. The new tests use disposable SQLite and real Excel read/write libraries; they cover essential-column Excel round trips, ignored source prices, draft imports with missing pages, duplicates, Student rates, immutable historic prices, quantities above 100, no-stock order approval/cancellation and settlement of legacy reservations. TypeScript and production build pass. Browser checks confirm real Excel export and import of the exported workbook with eight duplicate-row results. The local database migration preserved all eight books, the existing order and both order lines.

The older live integration suite below was not rerun against the user’s database, because it changes credentials and creates records. Run it only on a disposable local database with TEST_DISPOSABLE_DB=1. Its assertions now reflect Student pricing and stock-free ordering.

The final three-column export was also checked in the production Worker preview: Book Code, Book Name and Pages, with no prices. Importing that workbook returned eight duplicate-code results and no browser errors. The cleaned supplied workbook contains 330 rows; 322 page counts and one book name are missing. Importing it through the local admin UI saved 316 books: eight active with page counts and 308 drafts awaiting pages. Fourteen rows were skipped: seven existing codes, six rows sharing three duplicate codes, and one missing title. Source prices were ignored; existing books and order records were preserved.

## Theme, visibility and Clear data controls

The theme selector is an animated sun/moon button with reduced-motion support. Browser checks verified both themes and persistence. Book actions are Edit, Delete, On/Off, with no separate Homepage column or Duplicate action. CS306 was switched off, confirmed absent from the homepage, switched back on, and confirmed present after a reload.

Clear data appears below the search bar. Its review counts the entire catalog even when search is filtered and requires typing CLEAR. The live confirmation showed 324 books; the preview was cancelled, leaving all 324 books and the existing order intact. Destructive behavior was tested only in disposable SQLite: active/hidden/draft removal, preserved order items and payment review, rejection of stale quotes and edits, reusable book codes, admin-only access, typed confirmation and stale-count rejection. All 10 bookstore tests, TypeScript and the production build pass. Migration 0003 preserves existing catalog records and was applied after a local backup.

## Order ID-only tracking

Order tracking now accepts only an Order ID; the customer-facing private key field, generated key and key-based authorization have been removed. Existing references and legacy UUID links remain usable. Public responses use an explicit allowlist; customer details, payment documents, receipt downloads and replacement-proof uploads remain restricted to the ordering device or appropriate staff access.

All 21 automated checks pass across the domain/schema, authentication and bookstore suites (5, 4 and 12 tests respectively). The new isolated tests cover anonymous tracking, case/whitespace normalization, legacy links, response privacy, receipt access, rejection of legacy-key authorization, campus boundaries and invalid routes. TypeScript and all five production build phases pass. A read-only HTTP check against the existing local order confirmed anonymous tracking with private details excluded. Browser checks verified the one-field form, a helpful invalid-ID error, successful lookup of the existing order and a canonical tracking URL containing only its Order ID. The destructive live integration suite was not run against the user's database.

## Pending order badge, receipt design and simpler tracking

The Super Admin Orders navigation now shows an all-time count of PAYMENT_PENDING orders, independent of report dates and list filters. Server rendering supplies the initial count. A protected, no-store endpoint refreshes it every 15 seconds while the page is visible, on focus and after order decisions. Zero hides the badge. All 13 bookstore tests pass, including a new isolated lifecycle test covering zero/multiple/older pending orders, manual review, replacement-proof requests, approval, rejection, cancellation and guest/campus access restrictions. No real orders were changed to test the badge; the existing local order is already past confirmation, so its badge correctly remains absent.

Tracking now shows only the Order ID search and its result. Device-history requests and display, copy controls and generated tracking links are removed. Checkout handoff and legacy query URLs are consumed then cleared to /orders. Browser checks verified a successful existing-order lookup, no copy-link controls or history, an invalid lookup clearing the prior receipt and a clean search page. Desktop and phone-width receipt layouts were inspected with no horizontal overflow.

Both the on-screen/printed receipt and generated PDF have a branded header, order/date metadata, customer/delivery sections, item table, payment/order states, totals and a footer. PDF continuation pages repeat the header, table headings and numbered footer. A synthetic one-page sample and a five-page, 30-item sample with long titles, addresses and instructions were rendered and visually inspected on every page. The sample uses fictional contact details. TypeScript and the production build pass; the user's data and order history were preserved.

## Original verification results

- TypeScript: passed with no errors.
- Production build: all five build phases completed successfully, including browser, server-rendering and Worker bundles.
- Domain/schema suite: 5 tests passed. Includes OCR amount comparisons, locale-independent money, quantity validation, legal status transitions, and a real SQLite migration with transaction rollback/constraint checks.
- API integration suite: 22 scenarios passed in the final run. The initial run additionally exercised forced bootstrap password rotation and session invalidation. Uses local-only disposable QA records and real private proof objects.
- Production dependency audit: zero known vulnerabilities after updating Next and affected transitive dependencies. This is a point-in-time registry audit, not a security certification.
- Browser: desktop storefront at 1440px and mobile cart/checkout at 390px; light/dark themes; server-generated checkout review; bank instructions; proof-required submission; no horizontal mobile overflow; search integration returns CS101 and rejects invalid input.
- Production Worker browser check: administrator login, persisted dashboard statistics and charts, book management and its editing dialog. Corrected an unwanted numeric flag rendered beside the dashboard title.
- Fixed issues found during verification: locale-dependent price hydration, stale asynchronous portal responses, cart retrieval beyond the first catalog page, catalog pagination/search reset, book-detail lookup beyond the initial catalog page, private-note visibility and proof-reuse concurrency checks.

## Integration coverage

Anonymous write and cross-origin request rejection; four pricing categories; campus/Super Admin separation; unique book codes; forged client total rejection; quantity/city validation; proof ownership; disguised upload rejection; missing-OCR fallback; concurrent orders without stock limits; idempotent quote submission; tenant and guest boundaries; Order ID-only tracking with private detail protection; idempotent approval; invalid status transitions; readable PDF receipt; cancellation; disabled-campus session revocation; audit content; stale quotes after pricing changes; report aggregates; archive preserving history.

## Reviewable implementation map

| Requirement | Implementation |
|---|---|
| Student store, search, cart, checkout, tracking | `components/store.tsx`, `app/`, `lib/server/catalog.ts`, `lib/server/orders.ts` |
| Campus and Super Admin experiences | `components/portal.tsx`, `lib/server/portal-page.tsx`, scoped management API |
| Relational model and seed/bootstrap | `db/schema.ts`, `drizzle/0000_modern_marrow.sql`, `lib/server/seed.ts` |
| Authentication, authorization, sessions, CSRF | `lib/server/security.ts`, `lib/contracts.ts` |
| Server prices and order transactions | `lib/server/orders.ts`, transaction guards and database checks |
| Proof files, amount checks and OCR adapter | `lib/server/uploads.ts`, `lib/server/ocr.ts`, `lib/payment-status.ts` |
| PDF and print receipts | `lib/server/receipt.ts`, order tracking print layout |
| Books, campuses, staff, pricing, payments, settings | `app/api/[...path]/route.ts`, portal forms |
| Reports, exports and audit history | `lib/server/reports.ts`, `components/report-charts.tsx`, audit API |
| Responsive UI, themes, motion, accessibility | `app/globals.css`, `app/application.css`, `components/providers.tsx`, Radix primitives |
| SEO, metadata and crawl rules | `app/layout.tsx`, book detail metadata, sitemap and robots routes |
| Deployment and environment configuration | `README.md`, `docs/DEPLOYMENT.md`, `.env.example`, Cloudflare helper |

## External checks still required

Real OCR-provider credentials/sample accuracy; actual bank settlement verification; real catalog accuracy; support-contact confirmation; independent security assessment; workload/capacity tests; backup restoration; and any standalone Cloudflare account deployment. Report date filters and daily aggregates use UTC. Receipt PDFs use standard Latin fonts; browser printing supports Unicode text through installed fonts.

The installed Windows npm shim was unable to resolve its own files in the build helper. The identical application build entrypoint was invoked directly with Node. Source and deployment are not dependent on that workstation-specific shim.
