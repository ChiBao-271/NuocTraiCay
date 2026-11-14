import * as orderService from '../services/orderService.js';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import { getSePayCheckoutConfig } from '../services/sepayService.js';

function getUserScopedSupabase(req) {
  return createClient(config.supabaseUrl, config.supabaseKey, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ──────────────────────────────────────────────────────
//  POST /api/orders  — Tạo đơn hàng mới
//  Body: { customer, items, total, note, userId, paymentMethod }
// ──────────────────────────────────────────────────────
export async function createOrder(req, res) {
  try {
    const { customer, items, note, paymentMethod, voucherCode } = req.body ?? {};
    const allowedPaymentMethods = ['cod', 'sepay'];
    if (!allowedPaymentMethods.includes(paymentMethod || 'cod')) return res.status(400).json({ success: false, error: 'Phương thức thanh toán không hợp lệ.' });
    if (paymentMethod === 'sepay') {
      try { getSePayCheckoutConfig(); } catch { return res.status(503).json({ success: false, error: 'SePay chưa được cấu hình đầy đủ ở backend.' }); }
    }

    // Validate đầu vào
    const errors = orderService.validateOrderPayload({ customer, items, total: req.body?.total });
    if (errors.length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const order = await orderService.createOrder(
      { customer, items, note, userId: req.user.id, paymentMethod, voucherCode },
      getUserScopedSupabase(req),
    );
    if (paymentMethod === 'sepay' && !order.sepay) {
      return res.status(503).json({ success: false, error: 'SePay chưa được cấu hình hoặc đơn chưa tạo được phiên thanh toán.' });
    }

    res.status(201).json({
      success: true,
      message: 'Đặt hàng thành công.',
      data: order,
    });
  } catch (err) {
    console.error('[BE] createOrder error:', err.message);
    const message = String(err.message || '');
    const changedTotal = message.match(/^ORDER_TOTAL_CHANGED:(\d+)$/);
    if (changedTotal) return res.status(409).json({ success: false, error: 'Giá hoặc phí giao hàng vừa thay đổi.', code: 'ORDER_TOTAL_CHANGED', recalculated_total: Number(changedTotal[1]) });
    const clientError = /hiện không còn bán|Không thể xác minh sản phẩm|voucher|chưa đạt giá trị tối thiểu|không đủ tồn kho|không hợp lệ|UNSUPPORTED_PAYMENT_METHOD|PRODUCT_UNAVAILABLE|INSUFFICIENT_STOCK|INVALID_|DUPLICATE_/i.test(message);
    const needsMigration = message.startsWith('ORDER_MIGRATION_REQUIRED:');
    res.status(needsMigration ? 503 : clientError ? 400 : 500).json({
      success: false,
      error: needsMigration ? 'Checkout chưa sẵn sàng: cần áp dụng migration an toàn cho Supabase.' : clientError ? message : 'Không thể tạo đơn hàng lúc này.',
      ...(message.startsWith('ORDER_TOTAL_CHANGED:') ? { code: 'ORDER_TOTAL_CHANGED', recalculated_total: Number(message.split(':')[1]) } : {}),
    });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/orders/:id  — Lấy chi tiết 1 đơn hàng
// ──────────────────────────────────────────────────────
export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Thiếu order id.' });

    const order = await orderService.getOrderById(id, req.userDb);
    if (order && order.user_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền xem đơn hàng này.' });
    }
    if (!order) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    console.error('[BE] getOrderById error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/orders/user/:userId  — Lịch sử đơn của user
//  Query params: page, limit, status
// ──────────────────────────────────────────────────────
export async function getUserOrders(req, res) {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ success: false, error: 'Bạn không có quyền xem lịch sử đơn này.' });

    const { page, limit, status } = req.query;
    const result = await orderService.getOrdersByUserId(userId, { page, limit, status }, req.userDb);

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[BE] getUserOrders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  PATCH /api/orders/:id/cancel  — Huỷ đơn hàng
//  Body: { userId } (tuỳ chọn, để kiểm tra quyền sở hữu)
// ──────────────────────────────────────────────────────
export async function cancelOrder(req, res) {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ success: false, error: 'Thiếu order id.' });

    const data = await orderService.cancelOrder(id, req.user.id, req.userDb);

    res.json({
      success: true,
      message: 'Đơn hàng đã được huỷ thành công.',
      data,
    });
  } catch (err) {
    console.error('[BE] cancelOrder error:', err.message);
    const status = err.message.includes('không có quyền') ? 403
                 : err.message.includes('Không tìm thấy') ? 404
                 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
}
