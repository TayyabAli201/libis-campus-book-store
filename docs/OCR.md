# OCR integration contract

The app always treats extracted text as untrusted evidence. OCR cannot prove that a bank transfer exists, identify the payer conclusively, or establish settlement.

Configure `OCR_API_URL` to an HTTPS service and set `OCR_API_KEY` as a server secret. The app sends:

```http
POST <OCR_API_URL>
Authorization: Bearer <OCR_API_KEY>
Content-Type: image/jpeg | image/png | application/pdf

<raw uploaded file bytes>
```

The adapter must return JSON:

```json
{
  "amountMinor": 400000,
  "currency": "PKR",
  "confidence": 0.96,
  "text": "Optional extracted text, up to 10000 characters"
}
```

`400000` means PKR 4,000. Return `amountMinor: null` for unreadable or ambiguous documents. Confidence below 0.75, non-PKR currencies, invalid responses, timeouts and non-success responses all fall back to manual review. The app does not log or persist the optional raw text. The adapter should use a real OCR/document service, distinguish the transferred amount from balances/fees, and avoid inventing values.

The request times out after 15 seconds and rejects redirects. There is no mock success mode. The exact configured endpoint is the only outbound OCR destination; users cannot supply arbitrary URLs.

Workflow:

1. Validate size and binary signature; store bytes privately in R2.
2. Extract the amount through the adapter, if configured.
3. Compare integer amounts: matched, mismatched or OCR failed.
4. Submit the order with `PAYMENT_PENDING` / `PENDING` payment review regardless of OCR outcome.
5. Super Admin reviews the proof and the bank transaction, then approves, rejects, requests a replacement or marks manual review.
6. Every final decision is audited. A verified proof digest cannot be reused to approve another order.

Files with insufficient payment amounts produce the requested warning. They can remain available for manual review; they never bypass admin approval. An admin can request a replacement from the order screen, and the student can upload it from the tracking page on the device used to place the order.

Production integration acceptance tests: readable matching image, lower amount, higher amount, unreadable image, password-protected PDF, ambiguous balance versus transfer amount, provider timeout, invalid JSON, wrong currency, and reused proof. The provider itself was not live-tested because no OCR credentials were supplied.
