// Send Email hook (v8). Supabase calls this instead of sending mail itself.
// It sends ONE kind of email: the temporary password (recovery code) to the account's own address,
// through the Owner's Gmail on port 465 (Supabase blocks 25 and 587). Every other kind
// (email change, reauthentication, invite, magic link, signup) is dropped with a 200, so nothing goes out.
// Secrets, pasted by Austin in Edge Functions > Secrets, never in code:
//   SEND_EMAIL_HOOK_SECRET  (from Auth > Hooks when the hook is created, "v1,whsec_...")
//   GMAIL_APP_PASSWORD      (the same Gmail app password used for SMTP)
//   GMAIL_ADDRESS           (his Gmail address)
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import nodemailer from "npm:nodemailer@6.9.16";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

Deno.serve(async (req) => {
  const payload = await req.text();
  const secret = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
  let data: any;
  try {
    data = new Webhook(secret).verify(payload, Object.fromEntries(req.headers));
  } catch {
    return new Response(JSON.stringify({ error: { http_code: 401, message: "bad signature" } }), { status: 401 });
  }
  const type = data?.email_data?.email_action_type;
  const to = data?.user?.email;
  const code = String(data?.email_data?.token ?? "");
  if (type !== "recovery" || !to || !/^\d{6,10}$/.test(code)) {
    return new Response("{}", { status: 200, headers: { "content-type": "application/json" } }); // dropped on purpose
  }
  const from = Deno.env.get("GMAIL_ADDRESS")!;
  const t = nodemailer.createTransport({
    host: "smtp.gmail.com", port: 465, secure: true,
    auth: { user: from, pass: Deno.env.get("GMAIL_APP_PASSWORD") },
  });
  try {
    await t.sendMail({
      from: `"Portfolio app" <${from}>`, to, subject: "Your temporary password",
      text: `Your temporary password for the portfolio app is ${code}.\n\nIt works once, for 15 minutes. Sign in with it and you'll be asked to choose a new password.\n\nIf you didn't ask for this, ignore it: your password hasn't changed.`,
      html: `<h2>Your temporary password</h2><p>Your temporary password for the portfolio app is <strong>${esc(code)}</strong>.</p><p>It works once, for 15 minutes. Sign in with it and you'll be asked to choose a new password.</p><p>If you didn't ask for this, ignore it: your password hasn't changed.</p>`,
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: { http_code: 500, message: "could not send" } }), { status: 500 });
  }
  return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
});
