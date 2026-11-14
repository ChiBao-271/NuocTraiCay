import crypto from 'node:crypto';
import { config } from '../config/env.js';

const SIGNED_FIELDS = ['merchant','operation','payment_method','order_amount','currency','order_invoice_number','order_description','customer_id','success_url','error_url','cancel_url'];

function requiredEnv(name) {
  const value = config[name];
  if (!value) throw new Error(`Missing ${name} backend configuration.`);
  return value;
}

function getSePayEnvironment() {
  const env = config.sepayEnv || 'sandbox';
  if (!['sandbox','production'].includes(env)) throw new Error('SEPAY_ENV must be sandbox or production.');
  return {
    merchantId: requiredEnv('sepayMerchantId'),
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
  const signed = SIGNED_FIELDS.filter((key) => Object.hasOwn(fields, key) && fields[key] !== '' && fields[key] !== 0 && fields[key] !== '0').map((key) => `${key}=${fields[key]}`);
  return crypto.createHmac('sha256', secret).update(signed.join(',')).digest('base64');
}

export function buildSePayCheckoutForm({ orderCode, amount, customerId, description = '' }) {
  const { merchantId, secret, checkoutUrl, frontendUrl } = getSePayCheckoutConfig();
  const fields = {
    order_amount: String(Math.trunc(amount)),
    merchant: merchantId,
    currency: 'VND',
    operation: 'PURCHASE',
    order_description: String(description || `Thanh toan don ${orderCode}`).slice(0, 250),
    order_invoice_number: orderCode,
    success_url: `${frontendUrl}/order-success?payment=pending&order=${encodeURIComponent(orderCode)}`,
    error_url: `${frontendUrl}/checkout?payment=error&order=${encodeURIComponent(orderCode)}`,
    cancel_url: `${frontendUrl}/checkout?payment=cancel&order=${encodeURIComponent(orderCode)}`,
    lang: 'vi',
  };
  if (config.sepayPaymentMethod) fields.payment_method = config.sepayPaymentMethod;
  if (customerId) fields.customer_id = String(customerId);
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
