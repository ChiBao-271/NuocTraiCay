import crypto from 'node:crypto';
import { config } from '../config/env.js';

// Keep the signed field whitelist aligned with SePay's current form-checkout
// specification. Fields not supplied by checkout (e.g. customer_id and
// payment_method) are omitted from both signature input and submitted form.
const SIGNED_FIELDS = ['merchant','operation','order_amount','currency','order_invoice_number','order_description','success_url','error_url','cancel_url'];

function requiredEnv(name) {
  const value = config[name];
  if (!value) throw new Error(`Missing ${name} backend configuration.`);
  return value;
}

function getSePayEnvironment() {
  const env = config.sepayEnv || 'sandbox';
  if (!['sandbox','production'].includes(env)) throw new Error('SEPAY_ENV must be sandbox or production.');
  const merchantId = requiredEnv('sepayMerchantId').trim();
  // Prevent a common silent integration failure: Live merchant credentials
  // posted to the Sandbox checkout host (or vice versa). Never log the key.
  if (env === 'sandbox' && /-LIVE-/i.test(merchantId)) {
    throw new Error('SEPAY_CREDENTIAL_ENV_MISMATCH: Live merchant ID configured for sandbox checkout.');
  }
  return {
    merchantId,
    secret: requiredEnv('sepaySecretKey'),
    checkoutUrl: env === 'production' ? 'https://pay.sepay.vn/v1/checkout/init' : 'https://pay-sandbox.sepay.vn/v1/checkout/init',
    frontendUrl: requiredEnv('frontendUrl').replace(/\/$/, ''),
    env,
  };
}

export function getSePayCheckoutConfig() {
  return getSePayEnvironment();
}

export function getSePayIpnConfig() {
  return {
    ipnSecret: requiredEnv('sepayIpnSecret'),
    publicApiUrl: requiredEnv('publicApiUrl').replace(/\/$/, ''),
  };
}

function signFields(fields, secret) {
  const signed = SIGNED_FIELDS
    .filter((key) => Object.hasOwn(fields, key) && fields[key] !== '' && fields[key] !== null && fields[key] !== undefined)
    .map((key) => `${key}=${fields[key]}`);
  return crypto.createHmac('sha256', secret).update(signed.join(',')).digest('base64');
}

export function buildSePayCheckoutForm({ orderCode, amount, description = '' }) {
  const { merchantId, secret, checkoutUrl, frontendUrl } = getSePayCheckoutConfig();
  // Only post the nine documented fields so the submitted form contains
  // exactly the same fields as the signed string (SePay rejects a mismatch
  // between posted fields and the signature payload).
  const fields = {
    merchant: merchantId,
    operation: 'PURCHASE',
    order_amount: String(Math.trunc(amount)),
    currency: 'VND',
    order_invoice_number: orderCode,
    order_description: String(description || `Thanh toan don ${orderCode}`).slice(0, 250),
    success_url: `${frontendUrl}/order-success?payment=pending&order=${encodeURIComponent(orderCode)}`,
    error_url: `${frontendUrl}/checkout?payment=error&order=${encodeURIComponent(orderCode)}`,
    cancel_url: `${frontendUrl}/checkout?payment=cancel&order=${encodeURIComponent(orderCode)}`,
  };
  return { action: checkoutUrl, method: 'POST', fields: { ...fields, signature: signFields(fields, secret) } };
}

export function verifySePayWebhook(req) {
  const expected = getSePayIpnConfig().ipnSecret;
  const provided = req.get('x-secret-key') || '';
  return provided.length === expected.length && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
}

export function getSePayIpnUrl() {
  return `${getSePayIpnConfig().publicApiUrl}/api/payments/sepay/ipn`;
}
