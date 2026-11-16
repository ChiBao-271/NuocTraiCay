import { supabase } from '../supabase/client.js';

export const SHIPPING_FREE_THRESHOLD = 200000;
export const STANDARD_SHIPPING_FEE = 20000;

export function normalizeVoucherCode(code) {
  return String(code ?? '').trim().toUpperCase();
}

export function baseShippingFee(subtotal) {
  return Number(subtotal) >= SHIPPING_FREE_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}

// Kiểm tra một voucher có dùng được cho đơn hàng này không.
export function evaluateVoucher(voucher, subtotal) {
  const amount = Number(subtotal) || 0;
  const shippingBase = baseShippingFee(amount);
  if (!voucher) return { ok: false, reason: 'Mã giảm giá không tồn tại.' };
  if (voucher.is_active === false) return { ok: false, reason: 'Mã giảm giá đang tạm dừng.' };
  const now = Date.now();
  if (voucher.start_date && new Date(voucher.start_date).getTime() > now) return { ok: false, reason: 'Mã giảm giá chưa tới thời gian sử dụng.' };
  if (voucher.end_date && new Date(voucher.end_date).getTime() < now) return { ok: false, reason: 'Mã giảm giá đã hết hạn.' };
  if (voucher.usage_limit !== null && voucher.usage_limit !== undefined && Number(voucher.used_count || 0) >= Number(voucher.usage_limit)) {
    return { ok: false, reason: 'Mã giảm giá đã hết lượt sử dụng.' };
  }
  const minimum = Number(voucher.min_order_value || 0);
  if (amount < minimum) return { ok: false, reason: 'Đơn hàng chưa đạt giá trị tối thiểu ' + minimum.toLocaleString('vi-VN') + 'đ của mã này.' };

  const value = Number(voucher.discount_value || 0);
  const maxDiscount = Number(voucher.max_discount_amount || 0);
  let discountAmount = 0;
  let shippingFee = shippingBase;

  if (voucher.discount_type === 'percentage') {
    discountAmount = Math.min(amount, Math.round((amount * value) / 100));
    if (maxDiscount > 0) discountAmount = Math.min(discountAmount, maxDiscount);
  } else if (voucher.discount_type === 'fixed_amount') {
    discountAmount = Math.min(amount, Math.round(value));
  } else if (voucher.discount_type === 'freeship') {
    shippingFee = Math.max(0, shippingBase - Math.round(value || shippingBase));
  } else {
    return { ok: false, reason: 'Loại mã giảm giá không hợp lệ.' };
  }

  return {
    ok: true,
    discountAmount,
    shippingFee,
    totalAmount: Math.max(0, amount + shippingFee - discountAmount),
  };
}

export async function findVoucherByCode(code, db = supabase) {
  const normalized = normalizeVoucherCode(code);
  if (!normalized) return null;
  const { data, error } = await db
    .from('vouchers')
    .select('id,code,description,discount_type,discount_value,coin_cost,min_order_value,max_discount_amount,usage_limit,used_count,start_date,end_date,is_active')
    .eq('code', normalized)
    .maybeSingle();
  if (error) {
    if (error.code === '42501' || error.code === '42P01') return { unavailable: true, error };
    throw error;
  }
  return data;
}

export async function listActiveVouchers(subtotal, db = supabase) {
  const { data, error } = await db
    .from('vouchers')
    .select('id,code,description,discount_type,discount_value,coin_cost,min_order_value,max_discount_amount,usage_limit,used_count,start_date,end_date,is_active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const amount = Number(subtotal);
  return (data || []).map((voucher) => {
    const check = evaluateVoucher(voucher, Number.isFinite(amount) && amount > 0 ? amount : 0);
    return {
      code: voucher.code,
      description: voucher.description,
      discount_type: voucher.discount_type,
      discount_value: voucher.discount_value,
      min_order_value: voucher.min_order_value,
      max_discount_amount: voucher.max_discount_amount,
      coin_cost: voucher.coin_cost,
      end_date: voucher.end_date,
      is_active: voucher.is_active,
      applicable: Number.isFinite(amount) && amount > 0 ? check.ok : null,
      reason: check.ok ? null : check.reason,
      estimated_discount: check.ok ? check.discountAmount : 0,
    };
  });
}

export async function getAllVouchers(db = supabase) {
  const { data, error } = await db
    .from('vouchers')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

