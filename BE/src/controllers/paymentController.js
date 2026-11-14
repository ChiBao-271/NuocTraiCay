import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import * as orderService from '../services/orderService.js';
import { getSePayCheckoutConfig, verifySePayWebhook } from '../services/sepayService.js';

function adminDb() {
  if (!config.supabaseServiceRoleKey) throw new Error('Admin DB is not configured.');
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getUserDb(req) {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createSePayCheckout(req, res) {
  try {
    const { customer, items, total, note, voucherCode } = req.body ?? {};
    const errors = orderService.validateOrderPayload({ customer, items });
    if (errors.length) return res.status(400).json({ success: false, errors });
    if (!Number.isSafeInteger(Number(total)) || Number(total) <= 0) {
      return res.status(400).json({ success: false, error: 'Tổng tiền thanh toán không hợp lệ. Hãy tải lại giỏ hàng.' });
    }
    // Fail before creating a pending order if the gateway credentials are absent.
    try { getSePayCheckoutConfig(); }
    catch (error) {
      console.error('[BE] SePay checkout configuration error:', error.message);
      if (String(error.message).startsWith('SEPAY_CREDENTIAL_ENV_MISMATCH:')) {
        return res.status(503).json({ success: false, code: 'SEPAY_CREDENTIAL_ENV_MISMATCH', error: 'Render đang để chế độ Sandbox nhưng Merchant ID có vẻ là Live/Production. Hãy dùng cặp credentials Sandbox của Cổng thanh toán SePay.' });
      }
      return res.status(503).json({ success: false, code: 'SEPAY_NOT_CONFIGURED', error: 'SePay chưa được cấu hình đầy đủ trên backend.' });
    }
    const order = await orderService.createOrder({
      customer, items, total, note, userId: req.user.id, paymentMethod: 'sepay', voucherCode,
    }, getUserDb(req));
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    console.error('[BE] createSePayCheckout error:', err.message);
    const message = String(err.message || '');
    const changed = message.match(/^ORDER_TOTAL_CHANGED:(\d+)$/);
    if (changed) return res.status(409).json({ success: false, code: 'ORDER_TOTAL_CHANGED', recalculated_total: Number(changed[1]), error: 'Giá hoặc phí giao hàng vừa thay đổi.' });
    const migration = message.startsWith('ORDER_MIGRATION_REQUIRED:');
    const clientError = /INVALID_|PRODUCT_UNAVAILABLE|INSUFFICIENT_STOCK|VOUCHER|DUPLICATE_|UNSUPPORTED_PAYMENT|ORDER_TOTAL_TOO_LARGE/i.test(message);
    const configuration = /Missing .* backend configuration|SEPAY_ENV must/i.test(message);
    const credentialEnvironmentMismatch = message.startsWith('SEPAY_CREDENTIAL_ENV_MISMATCH:');
    const dbSetup = /payment migration|payment_provider|orders_payment_method_check|check constraint/i.test(message);
    const statusCode = migration || configuration || dbSetup || credentialEnvironmentMismatch ? 503 : clientError ? 400 : 500;
    const error = migration
      ? 'Chưa áp dụng migration tạo đơn mới nhất trên Supabase.'
      : credentialEnvironmentMismatch
        ? 'Render đang để chế độ Sandbox nhưng Merchant ID có vẻ là Live/Production. Hãy dùng cặp credentials Sandbox của Cổng thanh toán SePay.'
      : configuration
        ? 'SePay chưa được cấu hình đầy đủ trong BE/.env.'
        : dbSetup
          ? 'Database chưa áp dụng migration SePay (002_sepay_payment.sql).'
          : clientError ? message : 'Khởi tạo SePay thất bại; kiểm tra log backend để biết chi tiết.';
    return res.status(statusCode).json({ success: false, error });
  }
}

export async function receiveSePayIpn(req, res) {
  try {
    if (!verifySePayWebhook(req)) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
    if (!raw || raw.length > 100_000) return res.status(400).json({ success: false, error: 'Invalid webhook body' });
    let event;
    try { event = JSON.parse(raw); } catch { return res.status(400).json({ success: false, error: 'Invalid JSON' }); }
    if (event.notification_type !== 'ORDER_PAID') return res.status(200).json({ success: true, ignored: true });
    const order = event.order || {};
    const transaction = event.transaction || {};
    if (order.order_status !== 'CAPTURED' || transaction.transaction_status !== 'APPROVED') return res.status(200).json({ success: true, ignored: true });
    if (order.order_currency !== 'VND' || transaction.transaction_currency !== 'VND') return res.status(400).json({ success: false, error: 'Currency mismatch' });
    const amountText = String(transaction.transaction_amount ?? order.order_amount ?? '');
    if (!/^\d+(?:\.\d{1,2})?$/.test(amountText)) return res.status(400).json({ success: false, error: 'Invalid amount' });
    const amount = Number(amountText);
    if (!Number.isSafeInteger(amount)) return res.status(400).json({ success: false, error: 'Amount must be a whole VND amount' });
    const invoice = String(order.order_invoice_number || '');
    const transactionId = String(transaction.transaction_id || event.order?.id || '');
    if (!invoice || !transactionId) return res.status(400).json({ success: false, error: 'Missing invoice/transaction reference' });
    const { data, error } = await adminDb().rpc('apply_sepay_order_paid', {
      p_invoice: invoice, p_amount: amount, p_event_key: transactionId, p_payload: { notification_type: event.notification_type, order: { order_id: order.order_id, order_status: order.order_status, order_currency: order.order_currency, order_amount: order.order_amount, order_invoice_number: invoice }, transaction: { transaction_id: transaction.transaction_id, transaction_status: transaction.transaction_status, transaction_amount: transaction.transaction_amount, transaction_currency: transaction.transaction_currency, payment_method: transaction.payment_method } },
    });
    if (error) {
      console.error('[BE] SePay IPN DB apply failed:', error.code, error.message);
      return res.status(500).json({ success: false, error: 'Could not apply payment notification' });
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[BE] SePay IPN rejected:', err.message);
    return res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
}

export async function getSePayIpnSetup(req, res) {
  const { getSePayIpnUrl } = await import('../services/sepayService.js');
  try { return res.json({ success: true, data: { ipnUrl: getSePayIpnUrl() } }); }
  catch { return res.status(503).json({ success: false, error: 'Thiếu PUBLIC_API_URL trong cấu hình backend.' }); }
}
