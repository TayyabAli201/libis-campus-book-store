export function receiptDate(value: string) {
  return (
    new Date(value).toLocaleString("en-GB", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }) + " PKT"
  );
}

export function receiptPaymentNote(status: string) {
  return status === "VERIFIED"
    ? "Payment has been verified. Please keep this receipt for your records."
    : "This receipt acknowledges your order. Payment is confirmed only after verification.";
}
