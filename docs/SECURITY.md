# Security model

## Identity and authorization

- Passwords: scrypt (`N=32768`, `r=8`, `p=3`), random 16-byte salt, constant-time comparison. Passwords never appear in client bundles, API responses or audit payloads.
- Sessions: random 32-byte tokens; only SHA-256 token digests are stored. Eight-hour expiry, HttpOnly and SameSite=Strict cookies, Secure on HTTPS. Login generates a new session; reset/profile changes revoke sessions; disabled campuses revoke access immediately.
- The bootstrap account must change its password before using protected operations. Subsequent passwords require at least 12 characters and mixed letter case and digits.
- Super Admin authorization is checked on every privileged API. Campus permissions and campus identity come from the database. Campus book visibility includes globally available materials. Orders/students/reports are scoped to that campus.
- Students act as guests. Order ID alone allows a rate-limited, read-only tracking summary: status, payment status, books, totals and status timestamps. An explicit response allowlist excludes names, phone numbers, addresses, payment proofs, OCR details, staff identities and free-form notes. Full customer details, receipt downloads and replacement-proof uploads still require the ordering device's HttpOnly cookie or authorized staff access. No tracking key is generated for the customer, accepted as authorization, or displayed. The legacy unique `tracking_hash` column remains populated with an unused random digest for schema compatibility.
- Payment slip download is Super Admin only. Private admin notes are excluded from student and campus responses.

## Requests and data

- Mutating browser APIs require an exact same-origin `Origin` and a custom request header. No cross-origin CORS permission is exposed.
- Distributed D1 counters rate-limit login by network and email, quotes, orders, uploads and order lookups. Host-level rate limits should complement these application limits.
- Zod validates request fields. JSON/file streams are bounded before buffering. Monetary values are integer minor units and all prices/fees are recalculated on the server.
- SQL uses prepared statements. Foreign keys, uniqueness and check constraints defend relational and positive-quantity invariants. Version guards make stale edits fail safely.
- Uploads require a matching JPG/PNG/PDF signature and MIME type, with a configurable 1–10 MB cap. Random server object keys prevent path traversal. Images are served with explicit types and `nosniff`; proofs download with an attachment disposition and a sandbox policy.
- Signature checks do not constitute malware scanning. Add a scanning/quarantine adapter if your deployment policy requires inspection of untrusted PDFs before staff download.
- React escapes content. Book JSON-LD escapes `<`; user data is not rendered as HTML. CSP, HSTS, no-referrer, nosniff and feature-policy headers apply in production. Framework inline hydration scripts require the current CSP's inline allowance; a stricter nonce policy is a future hardening step.
- Staff/auth/order endpoints are not cached; robots excludes sensitive routes. Authentication/authorization remain mandatory regardless of robots rules.

## Audit and business integrity

Payment decisions, price changes, account and campus management, login, notes and proof access are logged with actor, timestamps and bounded browser information. Passwords and session tokens are excluded. Successful mutations and their audit entries share a transaction.

New orders do not track or reserve inventory. Payment approval is guarded against replay. Quotes expire after 30 minutes and are revalidated at submission. A unique quote reference makes retries idempotent. Historical order prices never change when category rates change.

Legacy inventory commitments are settled only for pre-existing orders before shipment. Refund requests do not execute transfers or assume returned goods are restockable. Staff must resolve refunds with the bank and inspect returns separately.

## Production responsibilities and limits

This implementation has functional and security regression tests. It has not received an independent penetration test or a real-world load/capacity certification. Use HTTPS, review allowed audiences, configure monitoring/backups, set appropriate Worker resources, and audit dependencies regularly.

The database currently retains business records indefinitely. Define and operate an appropriate retention and privacy-request process. The included policy pages are editable starting copy grounded in the implemented behavior, not jurisdiction-specific legal advice.

The PDF renderer uses the standard Latin font set. Browser printing preserves browser-supported scripts; embed an appropriate Unicode font if your live orders require Urdu or other non-Latin PDF text.
