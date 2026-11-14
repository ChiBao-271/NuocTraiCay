import { supabase } from '../supabase/client.js';
import { buildSePayCheckoutForm } from './sepayService.js';
import crypto from 'node:crypto';
import { getSePayCheckoutConfig } from './sepayService.js';

// ──────────────────────────────────────────────────────
//  Helper: tạo mã đơn hàng dạng ORD-YYYYMMDD-XXXX
// ──────────────────────────────────────────────────────
function generateOrderCode() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
  return `ORD-${date}-${rand}`;
}

// ──────────────────────────────────────────────────────
//  Validate dữ liệu đơn hàng đầu vào
// ──────────────────────────────────────────────────────
export function validateOrderPayload({ customer, items, total }) {
  const errors = [];

  if (!customer || typeof customer !== 'object' || Array.isArray(customer)) {
    errors.push('Thiếu thông tin khách hàng.');
  } else {
    if (typeof customer.fullName !== 'string' || customer.fullName.trim().length < 2 || customer.fullName.trim().length > 120)
      errors.push('Họ tên người nhận không hợp lệ (tối thiểu 2 ký tự).');
    const normalizedPhone = String(customer.phone || '').replace(/[\s().-]/g, '');
    if (!/^(0|\+84)[0-9]{8,10}$/.test(normalizedPhone))
      errors.push('Số điện thoại không hợp lệ (VD: 0901234567).');
    if (typeof customer.address !== 'string' || customer.address.trim().length < 5 || customer.address.trim().length > 300)
      errors.push('Địa chỉ giao hàng không hợp lệ (tối thiểu 5 ký tự).');
    if (customer.note !== undefined && customer.note !== null && (typeof customer.note !== 'string' || customer.note.length > 1000))
      errors.push('Ghi chú không hợp lệ (tối đa 1000 ký tự).');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    errors.push('Giỏ hàng trống, không thể đặt đơn.');
  } else if (items.length > 100) {
    errors.push('Đơn hàng vượt số dòng sản phẩm tối đa.');
  } else {
    items.forEach((item, idx) => {
      if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.id !== 'string' || !item.id.trim()) { errors.push(`Sản phẩm #${idx + 1} thiếu id.`); return; }
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) errors.push(`Sản phẩm #${idx + 1} có số lượng không hợp lệ (1–99).`);
    });
  }

  if (total !== undefined && total !== null && (!Number.isFinite(Number(total)) || Number(total) < 0 || Number(total) > 2000000000))
    errors.push('Tổng tiền tham chiếu không hợp lệ.');
  if (items?.length > 0 && items.some((item, index) => item?.id && items.findIndex((candidate) => candidate?.id === item.id) !== index))
    errors.push('Giỏ hàng có sản phẩm bị lặp. Hãy tải lại giỏ hàng và thử lại.');
  if (items?.length > 0 && items.some((item) => Number(item?.quantity) > 0 && Number(item?.price) * Number(item.quantity) > 2000000000))
    errors.push('Giá trị dòng sản phẩm vượt giới hạn cho phép.');

  // Do not trust client-provided prices or totals; createOrder recalculates both.

  return errors;
}

// ──────────────────────────────────────────────────────
//  Tính subtotal từ items (chống gian lận giá)
// ──────────────────────────────────────────────────────
export function calculateSubtotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

const SHIPPING_FREE_THRESHOLD = 200000;
const STANDARD_SHIPPING_FEE = 20000;
const SERVER_VOUCHERS = Object.freeze({
  FRESH10: { type: 'percent', value: 10, minimum: 0 },
  FREESHIP30: { type: 'shipping', value: 30000, minimum: 0 },
});

export function calculateOrderTotals(subtotal, rawVoucherCode = '') {
  const shippingFee = subtotal >= SHIPPING_FREE_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
  const voucherCode = String(rawVoucherCode || '').trim().toUpperCase();
  const voucher = voucherCode ? SERVER_VOUCHERS[voucherCode] : null;
  if (voucherCode && !voucher) throw new Error('Mã voucher không hợp lệ.');
  if (voucher && subtotal < voucher.minimum) throw new Error('Đơn hàng chưa đạt giá trị tối thiểu của voucher.');
  const discountAmount = voucher?.type === 'percent'
    ? Math.min(subtotal, Math.round(subtotal * voucher.value / 100))
    : voucher?.type === 'shipping' ? Math.min(shippingFee, voucher.value) : 0;
  const finalShipping = voucher?.type === 'shipping' ? Math.max(0, shippingFee - discountAmount) : shippingFee;
  return {
    subtotal,
    shippingFee: finalShipping,
    discountAmount: voucher?.type === 'shipping' ? 0 : discountAmount,
    totalAmount: Math.max(0, subtotal + finalShipping - (voucher?.type === 'shipping' ? 0 : discountAmount)),
    voucherCode: voucher ? voucherCode : null,
  };
}

// ──────────────────────────────────────────────────────
//  Tạo đơn hàng mới (orders + order_items)
// ──────────────────────────────────────────────────────
export async function createOrder({ customer, items, total, note, userId, paymentMethod = 'cod', voucherCode = '' }, db = supabase) {
  if (!['cod', 'sepay'].includes(paymentMethod)) throw new Error('Phương thức thanh toán không được hỗ trợ.');
  if (paymentMethod === 'sepay') getSePayCheckoutConfig();
  // Compute the authoritative preview from current database prices before the
  // RPC locks rows. A mismatch is rejected so checkout cannot confirm a stale total.
  const ids = [...new Set(items.map(({ id }) => id))];
  const { data: currentProducts, error: currentProductsError } = await db.from('products').select('id,name,price,is_available,stock_quantity').in('id', ids);
  if (currentProductsError) throw new Error('Không thể xác minh sản phẩm và giá hiện tại.');
  const byId = new Map((currentProducts || []).map((item) => [item.id, item]));
  const quantities = new Map(items.map((item) => [item.id, Number(item.quantity)]));
  let subtotal = 0;
  for (const [id, quantity] of quantities) {
    const product = byId.get(id);
    if (!product || product.is_available !== true) throw new Error(`Sản phẩm hiện không còn bán: ${id}`);
    if (product.stock_quantity !== null && product.stock_quantity !== undefined && Number(product.stock_quantity) < quantity) throw new Error(`Sản phẩm hiện không đủ tồn kho: ${product.name}`);
    subtotal += Number(product.price) * quantity;
  }
  const previewTotal = calculateOrderTotals(subtotal, voucherCode).totalAmount;
  if (Number.isFinite(Number(total)) && Number(total) !== previewTotal) throw new Error(`ORDER_TOTAL_CHANGED:${previewTotal}`);
  const orderCode = generateOrderCode();
  const { data, error } = await db.rpc('create_order_atomic', {
    p_order_code: orderCode,
    p_customer: customer,
    p_items: items.map(({ id, quantity }) => ({ id, quantity: Number(quantity) })),
    p_note: note || null,
    p_voucher_code: String(voucherCode || '').trim().toUpperCase() || null,
    p_payment_method: paymentMethod,
    p_expected_total: Number.isFinite(Number(total)) ? Number(total) : null,
  });
  if (error) {
    const message = String(error.message || '');
    if (/PGRST202|Could not find the function|schema cache/i.test(message)) throw new Error('ORDER_MIGRATION_REQUIRED: Run the latest BE/src/supabase/migrations/001_atomic_create_order.sql in Supabase SQL Editor, then wait for schema cache reload.');
    if (/ORDER_TOTAL_CHANGED:(\d+)/.test(message)) throw new Error(message.match(/ORDER_TOTAL_CHANGED:(\d+)/)[0]);
    if (/AUTH_REQUIRED|INVALID_|PRODUCT_UNAVAILABLE|INSUFFICIENT_STOCK|VOUCHER|DUPLICATE_/i.test(message)) throw new Error(message);
    throw new Error(`Lỗi tạo đơn an toàn: ${message}`);
  }
  if (!data?.order) throw new Error('Database không trả về đơn hàng sau khi tạo.');
  const order = { ...data.order, items: Array.isArray(data.items) ? data.items : [] };
  if (paymentMethod === 'sepay') {
    order.sepay = buildSePayCheckoutForm({ orderCode, amount: order.total_amount, customerId: userId, description: `Thanh toan don ${orderCode}` });
    if (db === supabase) {
      const { error: providerError } = await supabase.from('orders').update({ payment_provider: 'sepay' }).eq('id', order.id);
      if (providerError) throw new Error('Không thể lưu nhà cung cấp thanh toán cho đơn. Hãy áp dụng migration payment trước.');
    }
  }
  return order;
}

// ──────────────────────────────────────────────────────
//  Lấy chi tiết 1 đơn hàng theo id (kèm order_items)
// ──────────────────────────────────────────────────────
export async function getOrderById(orderId, db = supabase) {
  const { data: order, error: orderError } = await db
    .from('orders')
    .select(`
      id, order_code, user_id, recipient_name, recipient_phone,
      shipping_address, note, subtotal, shipping_fee, discount_amount,
      total_amount, coins_used, coins_earned, order_status,
      payment_method, payment_status, created_at, updated_at
    `)
    .eq('id', orderId)
    .single();

  if (orderError) {
    if (orderError.code === 'PGRST116') return null; // Not found
    throw new Error(`Lỗi lấy đơn hàng: ${orderError.message}`);
  }

  const { data: items, error: itemsError } = await db
    .from('order_items')
    .select('id, product_id, product_name, unit_price, quantity, item_subtotal')
    .eq('order_id', orderId)
    .order('id', { ascending: true });

  if (itemsError) console.warn('[orderService] order_items fetch warning:', itemsError.message);

  return { ...order, items: items || [] };
}

// ──────────────────────────────────────────────────────
//  Lịch sử đơn hàng của user (có phân trang & filter)
// ──────────────────────────────────────────────────────
export async function getOrdersByUserId(userId, { page = 1, limit = 10, status } = {}, db = supabase) {
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const from = (pageNumber - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = db
    .from('orders')
    .select(
      'id, order_code, recipient_name, total_amount, order_status, payment_status, payment_method, created_at',
      { count: 'exact' }
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') query = query.eq('order_status', status);

  const { data, error, count } = await query;
  if (error) throw new Error(`Lỗi lấy lịch sử đơn: ${error.message}`);

  return {
    data: data || [],
    total: count ?? 0,
    page: pageNumber,
    limit: pageSize,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  };
}

// ──────────────────────────────────────────────────────
//  Huỷ đơn hàng (chỉ khi status = pending)
// ──────────────────────────────────────────────────────
export async function cancelOrder(orderId, userId, db = supabase) {
  const { data: order, error: fetchError } = await db
    .from('orders')
    .select('id, order_code, order_status, user_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) throw new Error('Không tìm thấy đơn hàng.');

  if (order.user_id !== userId)
    throw new Error('Bạn không có quyền huỷ đơn hàng này.');

  if (order.order_status !== 'pending')
    throw new Error(`Không thể huỷ đơn hàng ở trạng thái "${order.order_status}". Chỉ huỷ được khi đơn đang chờ xác nhận.`);

  const { data, error } = await db
    .from('orders')
    .update({ order_status: 'cancelled' })
    .eq('id', orderId)
    .select('id, order_code, order_status')
    .single();

  if (error) throw new Error(`Lỗi huỷ đơn: ${error.message}`);
  return data;
}
