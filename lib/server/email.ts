interface SendPasswordResetParams {
  to: string;
  code: string;
  token: string;
  origin: string;
  email: string;
}

export async function sendPasswordResetEmail({
  to,
  code,
  token,
  origin,
  email,
}: SendPasswordResetParams) {
  const resetLink = `${origin}/admin/login?reset_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const subject = `Campus Bookstore - Admin Password Reset Code: ${code}`;
  const text = `Campus Bookstore Admin Password Reset\n\nA request was received to reset the password for your Super Admin account (${email}).\n\nYour 6-digit verification code: ${code}\n(Expires in 15 minutes)\n\nAlternatively, use this direct link to reset your password:\n${resetLink}\n\nIf you did not request this, please ignore this email.`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="border-top: 5px solid #2563a6; background: #edf5ff; padding: 20px 24px;">
      <h2 style="margin: 0; color: #1a3350; font-size: 20px;">Campus Bookstore</h2>
      <span style="font-size: 11px; letter-spacing: 0.12em; color: #5e7087; text-transform: uppercase; font-weight: 600;">Super Admin Account Security</span>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0; font-size: 15px; line-height: 1.5; color: #334155;">Hello,</p>
      <p style="font-size: 15px; line-height: 1.5; color: #334155;">A request was received to reset the password for your Super Admin account (<strong>${email}</strong>).</p>
      
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; display: block; margin-bottom: 8px;">Your 6-Digit Verification Code</span>
        <div style="font-size: 34px; font-weight: 700; letter-spacing: 6px; color: #2563a6; font-family: monospace;">${code}</div>
        <span style="font-size: 12px; color: #94a3b8; display: block; margin-top: 8px;">Expires in 15 minutes</span>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetLink}" style="display: inline-block; background: #2563a6; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 6px;">Reset Password Directly &rarr;</a>
      </div>

      <p style="font-size: 13px; line-height: 1.5; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-bottom: 0;">
        If you did not request this reset, you can safely ignore this email. Your current password remains unchanged.
      </p>
    </div>
  </div>
</body>
</html>`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM || "Campus Bookstore <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [to], subject, html, text }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string } | null;
        console.log(`Password reset email sent to ${to} via Resend (ID: ${data?.id})`);
        return { success: true, id: data?.id };
      } else {
        const err = await res.text();
        console.error("Resend API response error:", err);
      }
    } catch (e: any) {
      console.error("Resend fetch failed:", e.message);
    }
  }

  console.log(`[PASSWORD RESET EMAIL DISPATCHED]\nTo: ${to}\nSubject: ${subject}\nVerification Code: ${code}\nReset Link: ${resetLink}\n`);
  return { success: true };
}

interface SendVendorOrderEmailParams {
  vendor: { name: string; email: string };
  order: any;
  items: any[];
  origin?: string;
}

export async function sendVendorOrderAssignedEmail({
  vendor,
  order,
  items,
  origin,
}: SendVendorOrderEmailParams) {
  const portalLink = `${origin || "http://127.0.0.1:5173"}/vendor/login`;
  const subject = `[New Print Order] Reference: ${order.reference} - Campus Bookstore`;

  const booksRows = (items || [])
    .map(
      (it: any, idx: number) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${it.code || it.course_code || ""}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${it.title}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center;">${it.pages || "—"}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700;">${it.quantity}</td>
        </tr>`,
    )
    .join("");

  const text = `Salam ${vendor.name},\n\nA new printing order (${order.reference}) has been assigned to you.\n\nTotal Books: ${order.total_books || items?.length || 1}\nDelivery Type: ${order.delivery_type}\n\nPlease login to your Vendor Portal to view complete details:\n${portalLink}\n\nCampus Bookstore`;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background: #1e40af; color: #ffffff; padding: 20px 24px;">
      <h2 style="margin: 0; font-size: 18px;">Campus Bookstore — Printing Order</h2>
      <span style="font-size: 12px; opacity: 0.9;">Order Ref: ${order.reference}</span>
    </div>
    <div style="padding: 24px;">
      <p style="margin-top: 0;">Salam <strong>${vendor.name}</strong>,</p>
      <p>A new printing job has been assigned to you in the system:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
        <thead>
          <tr style="background: #f1f5f9; text-align: left;">
            <th style="padding: 8px 12px;">#</th>
            <th style="padding: 8px 12px;">Code</th>
            <th style="padding: 8px 12px;">Book Title</th>
            <th style="padding: 8px 12px; text-align: center;">Pages</th>
            <th style="padding: 8px 12px; text-align: center;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${booksRows}
        </tbody>
      </table>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${portalLink}" style="display: inline-block; background: #1e40af; color: #ffffff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open Vendor Portal &rarr;</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const from = process.env.EMAIL_FROM || "Campus Bookstore <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [vendor.email], subject, html, text }),
      });
      if (res.ok) {
        return { success: true };
      }
    } catch (e: any) {
      console.error("Failed to send vendor email via Resend:", e.message);
    }
  }

  console.log(`[VENDOR ORDER EMAIL LOGGED]\nTo: ${vendor.email}\nSubject: ${subject}\nPortal: ${portalLink}`);
  return { success: true };
}

