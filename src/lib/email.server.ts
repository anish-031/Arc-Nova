/**
 * Gmail SMTP via Nodemailer. Reads SMTP_USER + SMTP_PASS (Google App Password) at call time.
 * SERVER-ONLY — never import from client code.
 */
import nodemailer from "nodemailer";

type ConfirmEmailArgs = {
  to: string;
  productName: string;
  productType: string;
  price: number;
  txHash: string | null;
};

function getTransport() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error("SMTP_USER / SMTP_PASS not configured");
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });
}

export async function sendOrderConfirmationEmail(a: ConfirmEmailArgs) {
  const transport = getTransport();
  const html = renderHtml(a);
  await transport.sendMail({
    from: `"ARC NOVA" <${process.env.SMTP_USER}>`,
    to: a.to,
    subject: `[ARC NOVA] Order confirmed — ${a.productName}`,
    html,
    text: `Your order for ${a.productName} ($${a.price.toFixed(2)}) has been confirmed by the admin team.`,
  });
}

function renderHtml(a: ConfirmEmailArgs) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#e4e4e7">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#18181b;border:1px solid #27272a;border-radius:8px;overflow:hidden">
          <tr><td style="padding:24px 28px;border-bottom:1px solid #27272a">
            <div style="letter-spacing:.3em;font-size:12px;color:#22d3ee">// ARC NOVA</div>
            <h1 style="margin:8px 0 0;font-size:22px;color:#fafafa">Order Confirmed</h1>
          </td></tr>
          <tr><td style="padding:28px">
            <p style="margin:0 0 16px;color:#a1a1aa">Your order has been approved by the admin team and is now active.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#71717a;font-size:12px;letter-spacing:.2em">PRODUCT</td><td style="text-align:right;color:#22d3ee">${escapeHtml(a.productName)}</td></tr>
              <tr><td style="padding:8px 0;color:#71717a;font-size:12px;letter-spacing:.2em">TYPE</td><td style="text-align:right">${escapeHtml(a.productType)}</td></tr>
              <tr><td style="padding:8px 0;color:#71717a;font-size:12px;letter-spacing:.2em">PRICE</td><td style="text-align:right">$${a.price.toFixed(2)}</td></tr>
              ${a.txHash ? `<tr><td style="padding:8px 0;color:#71717a;font-size:12px;letter-spacing:.2em">TX</td><td style="text-align:right;font-size:11px">${escapeHtml(a.txHash)}</td></tr>` : ""}
            </table>
            <div style="margin-top:24px;padding:14px;border:1px solid #27272a;border-radius:6px;background:#0a0a0a">
              <div style="color:#22d3ee;font-size:12px;letter-spacing:.2em">// STATUS</div>
              <div style="color:#4ade80;font-weight:bold;margin-top:4px">SUCCESS</div>
            </div>
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #27272a;color:#52525b;font-size:11px">
            Stay in the grid. — ARC NOVA Ops
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
