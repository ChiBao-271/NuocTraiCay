'use client';

import { useCallback, useEffect, useState } from 'react';
import { disableAdminVoucher, fetchAdminVouchers, formatCurrency, saveAdminVoucher } from '../../../services/productService.js';

const TYPE_LABEL = {
  percentage: 'Giảm theo %',
  fixed_amount: 'Giảm số tiền',
  freeship: 'Giảm phí ship',
};

const EMPTY = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  min_order_value: '',
  max_discount_amount: '',
  usage_limit: '',
  start_date: '',
  end_date: '',
  is_active: true,
};

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function describeValue(voucher) {
  const value = Number(voucher.discount_value || 0);
  if (voucher.discount_type === 'percentage') return value + '%';
  return formatCurrency(value);
}

export default function AdminPromotionsPage() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [dialog, setDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminVouchers();
    setVouchers(result.data);
    setError(result.error?.message || '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY });
    setFormError('');
    setDialog(true);
  };

  const openEdit = (voucher) => {
    setEditingId(voucher.id);
    setForm({
      code: voucher.code || '',
      description: voucher.description || '',
      discount_type: voucher.discount_type || 'percentage',
      discount_value: String(voucher.discount_value ?? ''),
      min_order_value: String(voucher.min_order_value ?? ''),
      max_discount_amount: String(voucher.max_discount_amount ?? ''),
      usage_limit: String(voucher.usage_limit ?? ''),
      start_date: toInputDate(voucher.start_date),
      end_date: toInputDate(voucher.end_date),
      is_active: voucher.is_active !== false,
    });
    setFormError('');
    setDialog(true);
  };

  const change = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    const payload = {
      ...form,
      code: String(form.code).toUpperCase().trim(),
      discount_value: Number(form.discount_value),
      min_order_value: form.min_order_value === '' ? 0 : Number(form.min_order_value),
      max_discount_amount: form.max_discount_amount === '' ? null : Number(form.max_discount_amount),
      usage_limit: form.usage_limit === '' ? null : Number(form.usage_limit),
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    };
    const result = await saveAdminVoucher(payload, editingId);
    setSaving(false);
    if (result.error) {
      setFormError(result.error.message || 'Không lưu được mã giảm giá.');
      return;
    }
    setDialog(false);
    await load();
  };

  const disable = async (voucher) => {
    if (!window.confirm('Tạm dừng mã ' + voucher.code + '? Khách sẽ không dùng được mã này nữa.')) return;
    const result = await disableAdminVoucher(voucher.id);
    if (result.error) { setError(result.error.message); return; }
    await load();
  };

  return (
    <section className="admin-products-page">
      <div className="admin-page-header">
        <div>
          <span className="eyebrow">🏷️ Marketing</span>
          <h1>Khuyến mãi</h1>
          <p>{vouchers.length} mã giảm giá trong hệ thống</p>
        </div>
        <div className="admin-product-actions">
          <button className="btn btn-ghost" type="button" onClick={load} disabled={loading}>↻ Làm mới</button>
          <button className="btn btn-primary" type="button" onClick={openCreate}>＋ Thêm mã giảm giá</button>
        </div>
      </div>

      {error && <div className="admin-orders-error" role="alert">{error}</div>}

      <div className="admin-panel admin-products-panel">
        {loading ? (
          <div className="admin-orders-empty">Đang tải mã giảm giá…</div>
        ) : vouchers.length === 0 ? (
          <div className="admin-orders-empty">Chưa có mã giảm giá nào. Bấm “Thêm mã giảm giá” để tạo mã đầu tiên.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Mô tả</th>
                  <th>Giảm</th>
                  <th>Đơn tối thiểu</th>
                  <th>Lượt dùng</th>
                  <th>Thời gian</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td><strong>{voucher.code}</strong></td>
                    <td>{voucher.description || '—'}</td>
                    <td>
                      <strong>{describeValue(voucher)}</strong>
                      <small className="admin-order-date">{TYPE_LABEL[voucher.discount_type] || voucher.discount_type}</small>
                    </td>
                    <td>{Number(voucher.min_order_value || 0) > 0 ? formatCurrency(voucher.min_order_value) : 'Không yêu cầu'}</td>
                    <td>{Number(voucher.used_count || 0)} / {voucher.usage_limit ?? '∞'}</td>
                    <td>
                      <small className="admin-order-date">Từ: {toInputDate(voucher.start_date) || '—'}</small>
                      <small className="admin-order-date">Đến: {toInputDate(voucher.end_date) || 'không giới hạn'}</small>
                    </td>
                    <td>
                      <span className={'admin-pill ' + (voucher.is_active ? 'pill-paid' : 'pill-cancelled')}>
                        {voucher.is_active ? 'Đang chạy' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-product-actions">
                        <button className="btn btn-ghost" type="button" onClick={() => openEdit(voucher)}>Sửa</button>
                        {voucher.is_active && <button className="btn btn-ghost" type="button" onClick={() => disable(voucher)}>Tạm dừng</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {dialog && (
        <div className="admin-product-modal-backdrop" role="presentation" onClick={() => !saving && setDialog(false)}>
          <form className="admin-product-modal panel" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
            <h2>{editingId ? 'Sửa mã giảm giá' : 'Thêm mã giảm giá'}</h2>
            {formError && <div className="admin-orders-error" role="alert">{formError}</div>}
            <label>Mã (khách nhập)<input name="code" value={form.code} onChange={change} required placeholder="FRESH30" /></label>
            <label>Mô tả<input name="description" value={form.description} onChange={change} placeholder="Giảm 30% cho đơn đầu tiên" /></label>
            <label>Loại giảm giá<select name="discount_type" value={form.discount_type} onChange={change}>
              <option value="percentage">Giảm theo %</option>
              <option value="fixed_amount">Giảm số tiền</option>
              <option value="freeship">Giảm phí vận chuyển</option>
            </select></label>
            <label>{form.discount_type === 'percentage' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (đ)'}
              <input name="discount_value" type="number" min="1" value={form.discount_value} onChange={change} required />
            </label>
            <label>Đơn tối thiểu (đ)<input name="min_order_value" type="number" min="0" value={form.min_order_value} onChange={change} placeholder="0" /></label>
            <label>Giảm tối đa (đ)<input name="max_discount_amount" type="number" min="0" value={form.max_discount_amount} onChange={change} placeholder="Để trống nếu không giới hạn" /></label>
            <label>Số lượt dùng<input name="usage_limit" type="number" min="1" value={form.usage_limit} onChange={change} placeholder="Để trống nếu không giới hạn" /></label>
            <label>Bắt đầu<input name="start_date" type="date" value={form.start_date} onChange={change} /></label>
            <label>Kết thúc<input name="end_date" type="date" value={form.end_date} onChange={change} /></label>
            <label><input type="checkbox" name="is_active" checked={form.is_active} onChange={change} /> Đang hoạt động</label>
            <div className="admin-product-modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setDialog(false)} disabled={saving}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu mã'}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

