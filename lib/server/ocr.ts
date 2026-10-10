import { z } from "zod";
import { runtime } from "./db";
const resultSchema = z.object({
  amountMinor: z.number().int().nonnegative().max(1000000000).nullable(),
  currency: z.string().default("PKR"),
  confidence: z.number().min(0).max(1).default(0),
  text: z.string().max(10000).optional(),
});
// The configured adapter must return a conservative extraction, not a bank-verification claim.
export async function extractAmount(bytes: Uint8Array, mime: string) {
  const env = runtime();
  if (!env.OCR_API_URL || !env.OCR_API_KEY)
    return {
      status: "OCR_FAILED",
      amount: null,
      message:
        "Unable to automatically read the payment slip. Our team will verify it manually.",
    };
  try {
    const url = new URL(String(env.OCR_API_URL));
    if (url.protocol !== "https:")
      throw new Error("OCR endpoint must use HTTPS");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OCR_API_KEY}`,
        "Content-Type": mime,
      },
      body: bytes as unknown as BodyInit,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error("OCR provider unavailable");
    const parsed = resultSchema.parse(await response.json());
    if (
      parsed.amountMinor === null ||
      parsed.currency !== "PKR" ||
      parsed.confidence < 0.75
    )
      throw new Error("Ambiguous extraction");
    return {
      status: "EXTRACTED",
      amount: parsed.amountMinor,
      message:
        "Amount extracted. Bank receipt remains subject to admin verification.",
    };
  } catch {
    return {
      status: "OCR_FAILED",
      amount: null,
      message:
        "Unable to automatically read the payment slip. Our team will verify it manually.",
    };
  }
}
export { compareAmount } from '../payment-status';
