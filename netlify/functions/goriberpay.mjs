// Lightweight proxy for the Goriber Pay API.
// Browsers can't call pay.goriberpay.cyou directly (no CORS headers), so the
// page posts here and the request is forwarded. The Brand Key is sent as both
// BRAND-KEY and API-KEY because the gateway only accepts it that way.
const UPSTREAM = "https://pay.goriberpay.cyou/api/payment/";
const ALLOWED_ACTIONS = new Set(["create", "verify"]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

export default async (req, context) => {
  if (req.method !== "POST") return json({ status: false, message: "Method not allowed" }, 405);

  const action = context.params?.action;
  if (!ALLOWED_ACTIONS.has(action)) return json({ status: false, message: "Unknown action" }, 404);

  const brandKey = req.headers.get("brand-key");
  if (!brandKey) return json({ status: false, message: "Missing BRAND-KEY" }, 400);

  const body = await req.text();
  try {
    const upstream = await fetch(UPSTREAM + action, {
      method: "POST",
      // The gateway only accepts the Brand Key when it is also sent as API-KEY.
      headers: { "Content-Type": "application/json", "BRAND-KEY": brandKey, "API-KEY": brandKey },
      body,
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return json({ status: false, message: "Payment gateway unreachable" }, 502);
  }
};

export const config = { path: "/api/goriberpay/:action" };
