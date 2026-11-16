import { randomUUID } from 'node:crypto';
import { config } from '../config/env.js';

// ──────────────────────────────────────────────────────
//  GET /api/admin/dashboard  — thống kê tổng quan
// ──────────────────────────────────────────────────────
export async function uploadProductImage(req, res) {
  const allowedTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const contentType = req.get('content-type')?.split(';')[0]?.trim().toLowerCase();
  const extension = allowedTypes[contentType];
  if (!extension || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ success: false, error: 'Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc GIF.' });
  }
  if (req.body.length > 5 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: 'Ảnh không được vượt quá 5 MB.' });
  }

  try {
    const path = `products/${randomUUID()}.${extension}`;
    const { error } = await req.adminDb.storage.from('product-images').upload(path, req.body, {
      contentType, cacheControl: '3600', upsert: false,
    });
    if (error) throw error;
    const { data } = req.adminDb.storage.from('product-images').getPublicUrl(path);
    return res.status(201).json({ success: true, data: { path, url: data.publicUrl } });
  } catch (err) {
    console.error('[BE] uploadProductImage error:', err.message);
    return res.status(500).json({ success: false, error: 'Không thể tải ảnh lên. Hãy kiểm tra bucket product-images trong Supabase Storage.' });
  }
}

export async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const db = req.adminDb;

    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const [ordersRes, monthOrdersRes, customersRes, productsRes, ordersCountRes, pendingRes] = await Promise.all([
      db
        .from('orders')
        .select('id, order_code, recipient_name, total_amount, order_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10),
      db.from('orders').select('id,total_amount,order_status,payment_method,payment_status,created_at', { count: 'exact' }).gte('created_at', startOfMonth).lt('created_at', monthEnd).order('created_at', { ascending: true }).range(0, 999),
      db.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'customer'),
      db.from('products').select('id', { count: 'exact', head: true }).eq('is_available', true),
      db.from('orders').select('id', { count: 'exact', head: true }),
      db.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'pending'),
    ]);

    const monthOrders = [...(monthOrdersRes.data ?? [])];
    // Supabase REST returns at most its configured row cap per request. Page
    // through the month so revenue and order count are not silently truncated.
    while (monthOrdersRes.count !== null && monthOrders.length < monthOrdersRes.count) {
      const offset = monthOrders.length;
      const { data: nextPage, error: pageError } = await db
        .from('orders')
        .select('id,total_amount,order_status,payment_method,payment_status,created_at')
        .gte('created_at', startOfMonth)
        .lt('created_at', monthEnd)
        .order('created_at', { ascending: true })
        .range(offset, offset + 999);
      if (pageError) throw pageError;
      if (!nextPage?.length) break;
      monthOrders.push(...nextPage);
    }
    // Giá trị đơn trong tháng: mọi đơn chưa huỷ, chưa hoàn tiền, thanh toán không lỗi.
    // (Trước đây chỉ tính đơn đã thanh toán/đã giao nên tháng có đơn mà vẫn hiện 0 đ.)
    const billableOrders = monthOrders.filter((order) => {
      const status = String(order.order_status || '').toLowerCase();
      const paymentStatus = String(order.payment_status || '').toLowerCase();
      if (status === 'cancelled') return false;
      if (paymentStatus === 'refunded' || paymentStatus === 'failed') return false;
      return true;
    });
    const monthRevenue = billableOrders.reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);
    // Tiền thực sự đã thu: COD khi đơn hoàn tất, chuyển khoản khi đã thanh toán.
    const monthPaidRevenue = monthOrders
      .filter((order) => {
        if (String(order.order_status || '').toLowerCase() === 'cancelled') return false;
        const method = String(order.payment_method || '').trim().toLowerCase();
        const paymentStatus = String(order.payment_status || '').trim().toLowerCase();
        return method === 'cod' ? String(order.order_status || '').toLowerCase() === 'completed' : paymentStatus === 'paid';
      })
      .reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);

    const allOrders = ordersRes.data ?? [];
    const failedQuery = [ordersRes, monthOrdersRes, customersRes, productsRes, ordersCountRes, pendingRes].find((result) => result.error);
    if (failedQuery) throw failedQuery.error;

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: ordersCountRes.count ?? 0,
          pendingOrders: pendingRes.count ?? 0,
          monthOrders: monthOrdersRes.count ?? monthOrders.length,
          monthRevenue,
          monthPaidRevenue,
          totalCustomers: customersRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
        },
        recentOrders: allOrders,
      },
    });
  } catch (err) {
    console.error('[BE] getDashboard error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// Return the live catalog/profile counts and schema columns from the same
// Supabase project used by Render, so an empty admin screen is diagnosable.
export async function getAdminCatalogHealth(req, res) {
  try {
    // Run read-only requests against the same tables the admin pages use.
    // This avoids requiring a diagnostic SQL function/migration just to render
    // the dashboard, and surfaces real counts from the live project.
    const [products, categories, profiles, orders] = await Promise.all([
      req.adminDb.from('products').select('id,category_id,is_available', { count: 'exact' }),
      req.adminDb.from('categories').select('id,is_active', { count: 'exact' }),
      req.adminDb.from('profiles').select('id,role', { count: 'exact' }),
      req.adminDb.from('orders').select('id', { count: 'exact', head: true }),
    ]);
    const failed = [products, categories, profiles, orders].find((result) => result.error);
    if (failed) throw failed.error;
    let projectHost = null;
    try { projectHost = new URL(config.supabaseUrl).host; } catch { /* config error is reported by the RPC */ }
    return res.json({ success: true, data: {
      backendSupabaseHost: projectHost,
      counts: {
        products: products.count ?? products.data?.length ?? 0,
        availableProducts: (products.data || []).filter((row) => row.is_available === true).length,
        uncategorizedProducts: (products.data || []).filter((row) => row.category_id === null).length,
        categories: categories.count ?? categories.data?.length ?? 0,
        activeCategories: (categories.data || []).filter((row) => row.is_active === true).length,
        profiles: profiles.count ?? profiles.data?.length ?? 0,
        customers: (profiles.data || []).filter((row) => row.role === 'customer').length,
        admins: (profiles.data || []).filter((row) => row.role === 'admin').length,
        suppliers: (profiles.data || []).filter((row) => row.role === 'supplier').length,
        orders: orders.count ?? 0,
      },
    } });
  } catch (err) {
    console.error('[BE] getAdminCatalogHealth error:', err.code, err.message);
    return res.status(500).json({ success: false, code: err.code || 'ADMIN_CATALOG_HEALTH_FAILED', error: `Không đọc được tình trạng database: ${err.message || 'unknown error'}` });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/admin/orders  — tất cả đơn hàng (có filter)
// ──────────────────────────────────────────────────────
export async function getAllOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
    const from = (pageNumber - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = req.adminDb
      .from('orders')
      .select('id, order_code, recipient_name, recipient_phone, total_amount, order_status, payment_status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('order_status', status);
    }
    if (req.query.payment && req.query.payment !== 'all') query = query.eq('payment_status', req.query.payment);
    if (req.query.from) query = query.gte('created_at', req.query.from);
    if (req.query.to) query = query.lte('created_at', req.query.to);
    if (typeof req.query.search === 'string' && req.query.search.trim()) {
      const term = req.query.search.trim().replace(/[,%()]/g, '');
      query = query.or(`order_code.ilike.%${term}%,recipient_name.ilike.%${term}%,recipient_phone.ilike.%${term}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error('[BE] getAllOrders DB error:', error.code, error.message);
      return res.status(500).json({ success: false, code: error.code || 'ADMIN_ORDERS_LOAD_FAILED', error: 'Không thể tải danh sách đơn hàng. Vui lòng thử lại.' });
    }

    res.json({ success: true, data: data || [], total: count ?? 0, page: pageNumber, limit: pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) });
  } catch (err) {
    console.error('[BE] getAllOrders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getAdminOrderDetails(req, res) {
  try {
    const { data: order, error } = await req.adminDb.from('orders').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!order) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
    const { data: items, error: itemsError } = await req.adminDb.from('order_items').select('*').eq('order_id', req.params.id).order('id');
    if (itemsError) throw itemsError;
    return res.json({ success: true, data: { ...order, items: items || [] } });
  } catch (err) {
    console.error('[BE] getAdminOrderDetails error:', err.message);
    return res.status(500).json({ success: false, code: err.code || 'ADMIN_ORDER_DETAILS_FAILED', error: 'Không thể tải chi tiết đơn hàng. Vui lòng thử lại.' });
  }
}

// ──────────────────────────────────────────────────────
//  PATCH /api/admin/orders/:id  — cập nhật trạng thái
// ──────────────────────────────────────────────────────
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { order_status } = req.body;
    const allowed = ['pending', 'confirmed', 'preparing', 'shipping', 'completed', 'cancelled'];

    if (!allowed.includes(order_status)) return res.status(400).json({ success: false, error: 'Trạng thái đơn hàng không hợp lệ.' });
    const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['preparing', 'shipping', 'cancelled'], preparing: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };
    const { data: current, error: currentError } = await req.adminDb
      .from('orders').select('id, order_code, order_status').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
    if (current.order_status === order_status) return res.json({ success: true, data: current });
    if (!transitions[current.order_status]?.includes(order_status)) {
      return res.status(409).json({ success: false, error: 'Không thể chuyển trạng thái đơn hàng theo quy trình hiện tại.' });
    }

    const { data, error } = await req.adminDb
      .from('orders')
      .update({ order_status })
      .eq('id', id)
      .select('id, order_code, order_status')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] updateOrderStatus error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

function validateProductPayload(body, { partial = false } = {}) {
  const errors = [];
  const required = ['name', 'category_id', 'price'];
  if (!partial) for (const key of required) if (body[key] === undefined || body[key] === null || String(body[key]).trim() === '') errors.push(`Thiếu trường ${key}.`);
  if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 120)) errors.push('Tên sản phẩm phải từ 2–120 ký tự.');
  if (body.id !== undefined && body.id !== null && (typeof body.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(body.id))) errors.push('ID sản phẩm không hợp lệ.');
  if (body.slug !== undefined && (typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug))) errors.push('Slug chỉ dùng chữ thường, số và dấu gạch nối.');
  if (body.price !== undefined && (!Number.isInteger(Number(body.price)) || Number(body.price) < 0 || Number(body.price) > 2000000000)) errors.push('Giá sản phẩm không hợp lệ.');
  if (body.category_id !== undefined && (typeof body.category_id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/i.test(body.category_id))) errors.push('Danh mục sản phẩm không hợp lệ.');
  if (body.description !== undefined && body.description !== null && (typeof body.description !== 'string' || body.description.length > 1000)) errors.push('Mô tả sản phẩm tối đa 1000 ký tự.');
  if (body.stock_quantity !== undefined && body.stock_quantity !== null && (!Number.isInteger(Number(body.stock_quantity)) || Number(body.stock_quantity) < 0)) errors.push('Tồn kho phải là số nguyên không âm.');
  if (body.image_url !== undefined && body.image_url !== null && body.image_url !== '') {
    let imageUrl;
    try { imageUrl = new URL(String(body.image_url)); } catch { errors.push('URL ảnh không hợp lệ.'); }
    if (imageUrl && (imageUrl.protocol !== 'https:' || !['i.imgur.com', 'images.unsplash.com', 'storage.googleapis.com'].includes(imageUrl.hostname) && !imageUrl.hostname.endsWith('.supabase.co'))) errors.push('Ảnh phải dùng HTTPS từ host tin cậy (Supabase Storage, Imgur hoặc Unsplash).');
  }
  return errors;
}

export async function getAdminProducts(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const from = (page - 1) * limit;
    // `updated_at` is not part of the deployed products schema on every
    // project version. Selecting a missing column makes PostgREST reject the
    // entire list, so only request fields guaranteed by schema.sql.
    let query = req.adminDb.from('products').select('id,name,slug,category_id,price,unit,description,image_url,stock_quantity,origin,farming_standard,rating_avg,rating_count,is_available,is_bestseller,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (req.query.status === 'active') query = query.eq('is_available', true);
    if (req.query.status === 'inactive') query = query.eq('is_available', false);
    if (req.query.category && req.query.category !== 'all') query = query.eq('category_id', req.query.category);
    if (typeof req.query.search === 'string' && req.query.search.trim()) query = query.ilike('name', `%${req.query.search.trim().replace(/[,%()]/g, '')}%`);
    const { data, error, count } = await query;
    if (error) {
      console.error('[BE] getAdminProducts DB error:', error.code, error.message);
      return res.status(500).json({ success: false, code: error.code || 'ADMIN_PRODUCTS_LOAD_FAILED', error: 'Không thể tải danh sách sản phẩm. Vui lòng thử lại.' });
    }
    res.json({ success: true, data: data || [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) });
  } catch (err) {
    console.error('[BE] getAdminProducts error:', err.message);
    res.status(500).json({
      success: false,
      code: err.code || 'ADMIN_PRODUCTS_LOAD_FAILED',
      error: 'Không thể tải danh sách sản phẩm. Vui lòng thử lại.',
    });
  }
}

export async function getAdminCategories(req, res) {
  try {
    const { data, error } = await req.adminDb.from('categories').select('id,name,slug,icon,is_active,display_order').order('display_order', { ascending: true }).order('name', { ascending: true });
    if (error) {
      console.error('[BE] getAdminCategories DB error:', error.code, error.message);
      return res.status(500).json({ success: false, code: error.code || 'ADMIN_CATEGORIES_LOAD_FAILED', error: 'Không thể tải danh mục. Vui lòng thử lại.' });
    }
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[BE] getAdminCategories error:', err.message);
    res.status(500).json({ success: false, code: err.code || 'ADMIN_CATEGORIES_LOAD_FAILED', error: 'Không thể tải danh mục. Vui lòng thử lại.' });
  }
}

export async function saveAdminCategory(req, res) {
    const { name, slug, icon, is_active = true, display_order = 0 } = req.body || {};
    const id = req.params.id || req.body?.id;
  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80) return res.status(400).json({ success: false, error: 'Tên danh mục cần từ 2–80 ký tự.' });
  const normalizedSlug = (slug || name).toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!normalizedSlug) return res.status(400).json({ success: false, error: 'Slug danh mục không hợp lệ.' });
  if (typeof is_active !== 'boolean' || !Number.isInteger(Number(display_order)) || Number(display_order) < 0) return res.status(400).json({ success: false, error: 'Trạng thái hoặc thứ tự hiển thị không hợp lệ.' });
  const payload = { name: name.trim(), slug: normalizedSlug, icon: typeof icon === 'string' ? icon.trim().slice(0, 12) : null, is_active, display_order: Number(display_order) };
  if (id) {
    const { data, error } = await req.adminDb.from('categories').update(payload).eq('id', id).select('id,name,slug,icon,is_active,display_order').maybeSingle();
    if (error) return res.status(error.code === '23505' ? 409 : 500).json({ success: false, error: error.code === '23505' ? 'Slug danh mục đã tồn tại.' : 'Không thể cập nhật danh mục.' });
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy danh mục.' });
    return res.json({ success: true, data });
  }
  // The production schema uses UUID category ids with a database default.
  // Never use the human slug as `id` (that fails against uuid schemas).
  const { data, error } = await req.adminDb.from('categories').insert(payload).select('id,name,slug,icon,is_active,display_order').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ success: false, error: error.code === '23505' ? 'Danh mục hoặc slug đã tồn tại.' : 'Không thể tạo danh mục.' });
  return res.status(201).json({ success: true, data });
}

export async function getAdminUsers(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    // The Auth Admin list endpoint returns a DB error on the configured live
    // project. The live profiles table already has email/role/name and is the
    // source of truth used by the app to authorize admins, so list that table.
    const from = (page - 1) * perPage;
    const roleFilter = typeof req.query.role === 'string' ? req.query.role : '';
    if (roleFilter && !['admin', 'customer', 'supplier'].includes(roleFilter)) return res.status(400).json({ success: false, error: 'Vai trò cần lọc không hợp lệ.' });
    let profileQuery = req.adminDb.from('profiles')
      .select('id,email,full_name,phone,role,coins,created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + perPage - 1);
    if (roleFilter) profileQuery = profileQuery.eq('role', roleFilter);
    const { data, error, count } = await profileQuery;
    if (error) throw error;
    const users = (data || []).map((profile) => ({
      ...profile,
      last_sign_in_at: null,
      banned_until: null,
    }));
    const total = count ?? users.length;
    res.json({ success: true, data: users, total, page, limit: perPage, totalPages: Math.ceil(total / perPage), hasNextPage: page * perPage < total });
  } catch (err) {
    console.error('[BE] getAdminUsers error:', err.message);
    res.status(500).json({ success: false, code: err.code || 'ADMIN_USERS_LOAD_FAILED', error: 'Không thể tải danh sách tài khoản. Vui lòng thử lại.' });
  }
}

export async function updateAdminUserRole(req, res) {
  const { role } = req.body || {};
  if (!['admin', 'customer', 'supplier'].includes(role)) return res.status(400).json({ success: false, error: 'Vai trò không hợp lệ.' });
  if (req.params.id === req.user.id && role !== 'admin') return res.status(400).json({ success: false, error: 'Không thể tự hạ quyền admin của chính mình.' });
  try {
    const { count: adminCount, error: countError } = await req.adminDb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (countError) throw countError;
    const { data: targetProfile, error: targetProfileError } = await req.adminDb.from('profiles').select('role').eq('id', req.params.id).maybeSingle();
    if (targetProfileError) throw targetProfileError;
    if (role !== 'admin' && targetProfile?.role === 'admin' && (adminCount || 0) <= 1) return res.status(409).json({ success: false, error: 'Không thể hạ quyền admin cuối cùng.' });
    if (!targetProfile) return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ tài khoản.' });
    const { data: targetWithEmail, error: emailError } = await req.adminDb.from('profiles').select('id,email,role').eq('id', req.params.id).maybeSingle();
    if (emailError) throw emailError;
    const { error: profileError } = await req.adminDb.from('profiles').update({ role }).eq('id', req.params.id);
    if (profileError) throw profileError;
    res.json({ success: true, data: { id: req.params.id, email: targetWithEmail?.email || null, role } });
  } catch (err) {
    console.error('[BE] updateAdminUserRole error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể cập nhật quyền tài khoản.' });
  }
}

export async function createAdminProduct(req, res) {
  try {
    const errors = validateProductPayload(req.body);
    if (errors.length) return res.status(400).json({ success: false, errors });
    const categoryId = req.body.category_id;
    const { data: category, error: categoryError } = await req.adminDb.from('categories').select('id').eq('id', categoryId).maybeSingle();
    if (categoryError) throw categoryError;
    if (!category) return res.status(400).json({ success: false, error: 'Danh mục không tồn tại hoặc đang bị ẩn.' });
    const payload = {
      id: req.body.id?.trim() || randomUUID(), name: req.body.name.trim(), category_id: category.id,
      price: Number(req.body.price), unit: req.body.unit?.trim() || 'kg', slug: req.body.slug?.trim() || req.body.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      description: req.body.description?.trim() || null,
      image_url: req.body.image_url || null, stock_quantity: req.body.stock_quantity === undefined || req.body.stock_quantity === '' ? null : Number(req.body.stock_quantity),
      origin: req.body.origin?.trim() || null, farming_standard: req.body.farming_standard?.trim() || null,
      is_available: req.body.is_available !== false, is_bestseller: req.body.is_bestseller === true,
    };
    const { data, error } = await req.adminDb.from('products').insert(payload).select('*').single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ success: false, error: 'Mã sản phẩm đã tồn tại.' });
      throw error;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[BE] createAdminProduct error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể tạo sản phẩm.' });
  }
}

export async function updateAdminProduct(req, res) {
  try {
    const errors = validateProductPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ success: false, errors });
    const fields = ['name','slug','price','unit','description','image_url','stock_quantity','origin','farming_standard','is_available','is_bestseller','nutrition_info'];
    const update = {};
    for (const field of fields) if (Object.hasOwn(req.body, field)) update[field] = req.body[field];
    if (Object.hasOwn(req.body, 'category_id')) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.category_id)) return res.status(400).json({ success: false, error: 'Danh mục không hợp lệ.' });
      const { data: category, error: categoryError } = await req.adminDb.from('categories').select('id').eq('id', req.body.category_id).maybeSingle();
      if (categoryError) throw categoryError;
      if (!category) return res.status(400).json({ success: false, error: 'Danh mục không tồn tại hoặc đang bị ẩn.' });
      update.category_id = category.id;
    }
    if (Object.hasOwn(update, 'is_available') && typeof update.is_available !== 'boolean') return res.status(400).json({ success: false, error: 'is_available phải là boolean.' });
    if (Object.hasOwn(update, 'is_bestseller') && typeof update.is_bestseller !== 'boolean') return res.status(400).json({ success: false, error: 'is_bestseller phải là boolean.' });
    if (Object.hasOwn(update, 'price')) update.price = Number(update.price);
    if (Object.hasOwn(req.body, 'unit')) update.unit = String(req.body.unit || '').trim() || 'kg';
    if (Object.hasOwn(update, 'stock_quantity') && update.stock_quantity !== null && update.stock_quantity !== '') update.stock_quantity = Number(update.stock_quantity);
    if (update.stock_quantity === '') update.stock_quantity = null;
    const { data, error } = await req.adminDb.from('products').update(update).eq('id', req.params.id).select('*').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] updateAdminProduct error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể cập nhật sản phẩm.' });
  }
}

export async function archiveAdminProduct(req, res) {
  try {
    const { data, error } = await req.adminDb.from('products').update({ is_available: false }).eq('id', req.params.id).select('id,is_available').maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    res.json({ success: true, data, message: 'Đã ẩn sản phẩm khỏi cửa hàng.' });
  } catch (err) {
    console.error('[BE] archiveAdminProduct error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể ẩn sản phẩm.' });
  }
}
