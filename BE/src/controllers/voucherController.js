import { evaluateVoucher, findVoucherByCode, getAllVouchers, listActiveVouchers, normalizeVoucherCode } from '../services/voucherService.js';

const TYPES = ['percentage', 'fixed_amount', 'freeship'];

function normalizeBody(body = {}) {
  const code = normalizeVoucherCode(body.code);
  const type = String(body.discount_type || '').trim();
  const value = Number(body.discount_value);
  const isEmpty = (v) => v === '' || v === undefined || v === null;
  const minOrder = isEmpty(body.min_order_value) ? 0 : Number(body.min_order_value);
  const maxDiscount = isEmpty(body.max_discount_amount) ? null : Number(body.max_discount_amount);
  const usageLimit = isEmpty(body.usage_limit) ? null : Number(body.usage_limit);
  const coinCost = isEmpty(body.coin_cost) ? 0 : Number(body.coin_cost);
  return {
    code,
    description: typeof body.description === 'string' ? body.description.trim().slice(0, 300) : null,
    discount_type: type,
    discount_value: value,
    coin_cost: coinCost,
    min_order_value: minOrder,
    max_discount_amount: maxDiscount,
    usage_limit: usageLimit,
    start_date: body.start_date ? new Date(body.start_date).toISOString() : null,
    end_date: body.end_date ? new Date(body.end_date).toISOString() : null,
    is_active: body.is_active !== false,
  };
}

function validatePayload(payload, { partial = false } = {}) {
  const errors = [];
  if (!partial || payload.code !== undefined) {
    if (!/^[A-Z0-9_-]{3,32}$/.test(payload.code || '')) errors.push('Mã giảm giá cần 3–32 ký tự, chỉ gồm chữ, số, gạch ngang hoặc gạch dưới.');
  }
  if (!partial || payload.discount_type !== undefined) {
    if (!TYPES.includes(payload.discount_type)) errors.push('Loại giảm giá không hợp lệ.');
  }
  if (!partial || payload.discount_value !== undefined) {
    if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) errors.push('Giá trị giảm phải lớn hơn 0.');
    if (payload.discount_type === 'percentage' && payload.discount_value > 100) errors.push('Phần trăm giảm tối đa là 100.');
  }
  if (payload.min_order_value !== undefined && (!Number.isFinite(payload.min_order_value) || payload.min_order_value < 0)) errors.push('Giá trị đơn tối thiểu không hợp lệ.');
  if (payload.max_discount_amount !== null && payload.max_discount_amount !== undefined && (!Number.isFinite(payload.max_discount_amount) || payload.max_discount_amount < 0)) errors.push('Mức giảm tối đa không hợp lệ.');
  if (payload.usage_limit !== null && payload.usage_limit !== undefined && (!Number.isInteger(payload.usage_limit) || payload.usage_limit < 1)) errors.push('Số lượt dùng phải là số nguyên dương.');
  if (payload.start_date && payload.end_date && new Date(payload.start_date) >= new Date(payload.end_date)) errors.push('Ngày kết thúc phải sau ngày bắt đầu.');
  return errors;
}

// GET /api/vouchers?subtotal=123000
export async function getPublicVouchers(req, res) {
  try {
    const data = await listActiveVouchers(req.query.subtotal);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] getPublicVouchers:', err.code, err.message);
    const blocked = err.code === '42501' || err.code === '42P01';
    return res.status(blocked ? 503 : 500).json({
      success: false,
      code: blocked ? 'VOUCHERS_NOT_READY' : 'VOUCHERS_FAILED',
      error: blocked ? 'Chức năng mã giảm giá chưa được bật trong database.' : 'Không tải được danh sách mã giảm giá.',
    });
  }
}

// POST /api/vouchers/validate { code, subtotal }
export async function validateVoucher(req, res) {
  try {
    const code = normalizeVoucherCode(req.body?.code);
    const subtotal = Number(req.body?.subtotal);
    if (!code) return res.status(400).json({ success: false, error: 'Vui lòng nhập mã giảm giá.' });
    if (!Number.isFinite(subtotal) || subtotal <= 0) return res.status(400).json({ success: false, error: 'Giỏ hàng chưa có sản phẩm.' });
    const voucher = await findVoucherByCode(code);
    if (voucher && voucher.unavailable) {
      return res.status(503).json({ success: false, code: 'VOUCHERS_NOT_READY', error: 'Chức năng mã giảm giá chưa được bật trong database.' });
    }
    const result = evaluateVoucher(voucher, subtotal);
    if (!result.ok) return res.status(400).json({ success: false, error: result.reason });
    return res.json({ success: true, data: {
      code: voucher.code,
      description: voucher.description,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      discountAmount: result.discountAmount,
      shippingFee: result.shippingFee,
      totalAmount: result.totalAmount,
    } });
  } catch (err) {
    console.error('[BE] validateVoucher:', err.message);
    return res.status(500).json({ success: false, error: 'Không kiểm tra được mã giảm giá.' });
  }
}

// ── Quản trị ────────────────────────────────────────────
export async function getAdminVouchers(req, res) {
  try {
    const data = await getAllVouchers(req.adminDb);
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] getAdminVouchers:', err.code, err.message);
    const blocked = err.code === '42501' || err.code === '42P01';
    return res.status(blocked ? 503 : 500).json({
      success: false,
      code: blocked ? 'VOUCHERS_NOT_READY' : 'ADMIN_VOUCHERS_FAILED',
      error: blocked ? 'Chưa có quyền truy cập bảng vouchers.' : 'Không tải được danh sách khuyến mãi.',
    });
  }
}

export async function createAdminVoucher(req, res) {
  const payload = normalizeBody(req.body);
  const errors = validatePayload(payload);
  if (errors.length) return res.status(400).json({ success: false, errors });
  try {
    const { data, error } = await req.adminDb.from('vouchers').insert(payload).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, error: 'Mã giảm giá này đã tồn tại.' });
      throw error;
    }
    return res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[BE] createAdminVoucher:', err.code, err.message);
    return res.status(500).json({ success: false, error: 'Không tạo được mã giảm giá.' });
  }
}

export async function updateAdminVoucher(req, res) {
  const payload = normalizeBody(req.body);
  const errors = validatePayload(payload, { partial: true });
  if (errors.length) return res.status(400).json({ success: false, errors });
  try {
    const { data, error } = await req.adminDb.from('vouchers').update(payload).eq('id', req.params.id).select('*').maybeSingle();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, error: 'Mã giảm giá này đã tồn tại.' });
      throw error;
    }
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy mã giảm giá.' });
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] updateAdminVoucher:', err.message);
    return res.status(500).json({ success: false, error: 'Không cập nhật được mã giảm giá.' });
  }
}

export async function deleteAdminVoucher(req, res) {
  try {
    const { data, error } = await req.adminDb.from('vouchers').update({ is_active: false }).eq('id', req.params.id).select('id,code,is_active').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy mã giảm giá.' });
    return res.json({ success: true, data, message: 'Đã tạm dừng mã giảm giá.' });
  } catch (err) {
    console.error('[BE] deleteAdminVoucher:', err.message);
    return res.status(500).json({ success: false, error: 'Không tạm dừng được mã giảm giá.' });
  }
}

