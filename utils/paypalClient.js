// Modern PayPal server SDK
import paypal from "@paypal/checkout-server-sdk"; 


// ----------------------------
// 3) PayPal environment helper
//    Switches between Sandbox and Live based on ENVIRONMENT_MODE
// ----------------------------
function buildPayPalClient() {
  const mode = (process.env.ENVIRONMENT_MODE || "SANDBOX").toUpperCase();
  const isLive = mode === "LIVE";

  const clientId = isLive
    ? process.env.PAYPAL_CLIENT_ID_LIVE
    : process.env.PAYPAL_CLIENT_ID_SANDBOX;
  const clientSecret = isLive
    ? process.env.PAYPAL_SECRET_LIVE
    : process.env.PAYPAL_SECRET_SANDBOX;

  if (!clientId || !clientSecret) {
    throw new Error(
      `PayPal credentials missing mode ${mode}. Check your .env.`
    );
  }

  const Environment = isLive
    ? paypal.core.LiveEnvironment
    : paypal.core.SandboxEnvironment;

  return new paypal.core.PayPalHttpClient(new Environment(clientId, clientSecret));
}

export const paypalClient=buildPayPalClient()
