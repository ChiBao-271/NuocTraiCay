'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchAdminCategories, saveAdminCategory } from '../../../services/productService.js';

const EMPTY = { name: '', slug: '', icon: '', is_active: true, display_order: 0 };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [dialog, setDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdminCategories();
    setCategories(result.data);
    setError(result.error?.message || '');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (category = null) => {
    setEditing(category?.id || null);
    setForm(category ? { name: category.name, slug: category.slug, icon: category.icon || '', is_active: category.is_active, display_order: category.display_order || 0 } : { ...EMPTY });
    setError('');
    setDialog(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const result = await saveAdminCategory({ ...form, display_order: Number(form.display_order) }, editing);
    setSaving(false);
    if (result.error) { setError(result.error.message || 'Không lưu được danh mục.'); return; }
    setDialog(false);
    await load();
  };

  return (
    <section className="admin-products-page">
      <div className="admin-page-header">
        <div><span className="eyebrow">🗂️ Danh mục</span><h1>Quản lý danh mục</h1><p>{categories.length} danh mục</p></div>
        <button className="btn btn-primary" onClick={() => open()}>＋ Thêm danh mục</button>
      </div>
      {error && <div className="admin-orders-error" role="alert">{error}</div>}
      <div className="admin-panel admin-products-panel">
        {loading ? <div className="admin-orders-empty">Đang tải danh mục…</div> : error ? <div className="admin-orders-empty">Không tải được danh mục. Bấm “Làm mới” hoặc tải lại trang.</div> : categories.length === 0 ? <div className="admin-orders-empty">Cửa hàng chưa có danh mục nào. Bấm “Thêm danh mục” để tạo mới.</div> : (
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Danh mục</th><th>Slug</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
            {categories.map((category) => <tr key={category.id}><td>{category.name}</td><td>{category.slug}</td><td>{category.is_active ? 'Hiển thị' : 'Đang ẩn'}</td><td><button className="btn btn-ghost" onClick={() => open(category)}>Sửa</button></td></tr>)}
          </tbody></table></div>
        )}
      </div>
      {dialog && <div className="admin-product-modal-backdrop" role="presentation" onClick={() => !saving && setDialog(false)}><form className="admin-product-modal panel" onSubmit={submit} onClick={(event) => event.stopPropagation()}>
        <h2>{editing ? 'Sửa danh mục' : 'Thêm danh mục'}</h2>{error && <div className="admin-orders-error">{error}</div>}
        <label>Tên<input required minLength="2" maxLength="80" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
        <label>Slug<input value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} /></label>
        <label><input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} /> Hiển thị</label>
        <div className="admin-product-modal-actions"><button type="button" className="btn btn-ghost" onClick={() => setDialog(false)}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu'}</button></div>
      </form></div>}
    </section>
  );
}
