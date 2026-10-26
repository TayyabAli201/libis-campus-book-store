// OCR has been disabled in favor of manual administrator payment verification.
export async function extractAmount(_bytes?: Uint8Array, _mime?: string) {
  return {
    status: "MANUAL_VERIFICATION",
    amount: null,
    message: "Payment proof uploaded for manual verification.",
  };
}
export { compareAmount } from "../payment-status";
