import { randomUUID } from 'node:crypto';

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

    const [ordersRes, monthRes, customersRes, productsRes] = await Promise.all([
      db
        .from('orders')
        .select('id, order_code, recipient_name, total_amount, order_status, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(10),
      db
        .from('orders')
        .select('id, total_amount, order_status', { count: 'exact' })
        .gte('created_at', startOfMonth),
      db.from('profiles').select('id', { count: 'exact', head: true }),
      db.from('products').select('id', { count: 'exact', head: true }).eq('is_available', true),
    ]);

    const monthOrders = monthRes.data ?? [];
    const monthRevenue = monthOrders
      .filter((o) => o.order_status !== 'cancelled')
      .reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);

    const allOrders = ordersRes.data ?? [];
    const { count: pendingOrders, error: pendingError } = await db.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'pending');
    if (ordersRes.error || monthRes.error || customersRes.error || productsRes.error || pendingError) throw ordersRes.error || monthRes.error || customersRes.error || productsRes.error || pendingError;

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: ordersRes.count ?? 0,
          pendingOrders: pendingOrders ?? 0,
          monthOrders: monthRes.count ?? monthOrders.length,
          monthRevenue,
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
    if (error) throw error;

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
    const { data: items, error: itemsError } = await req.adminDb.from('order_items').select('id,product_id,product_name,unit_price,quantity,item_subtotal').eq('order_id', req.params.id).order('id');
    if (itemsError) throw itemsError;
    return res.json({ success: true, data: { ...order, items: items || [] } });
  } catch (err) {
    console.error('[BE] getAdminOrderDetails error:', err.message);
    return res.status(500).json({ success: false, error: 'Không thể tải chi tiết đơn hàng.' });
  }
}

// ──────────────────────────────────────────────────────
//  PATCH /api/admin/orders/:id  — cập nhật trạng thái
// ──────────────────────────────────────────────────────
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { order_status } = req.body;
    const allowed = ['pending', 'confirmed', 'shipping', 'completed', 'cancelled'];

    if (!allowed.includes(order_status)) return res.status(400).json({ success: false, error: 'Trạng thái đơn hàng không hợp lệ.' });
    const transitions = { pending: ['confirmed', 'cancelled'], confirmed: ['shipping', 'cancelled'], shipping: ['completed'], completed: [], cancelled: [] };
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
    let query = req.adminDb.from('products').select('id,name,slug,category_id,price,description,image_url,stock_quantity,origin,farming_standard,rating_avg,is_available,is_bestseller,created_at,updated_at', { count: 'exact' }).order('created_at', { ascending: false }).range(from, from + limit - 1);
    if (req.query.status === 'active') query = query.eq('is_available', true);
    if (req.query.status === 'inactive') query = query.eq('is_available', false);
    if (req.query.category && req.query.category !== 'all') query = query.eq('category_id', req.query.category);
    if (typeof req.query.search === 'string' && req.query.search.trim()) query = query.ilike('name', `%${req.query.search.trim().replace(/[,%()]/g, '')}%`);
    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [], total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) });
  } catch (err) {
    console.error('[BE] getAdminProducts error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể tải danh sách sản phẩm.' });
  }
}

export async function getAdminCategories(req, res) {
  try {
    const { data, error } = await req.adminDb.from('categories').select('id,name,slug,icon,is_active,display_order').order('display_order', { ascending: true }).order('name', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[BE] getAdminCategories error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể tải danh mục sản phẩm.' });
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
  const categoryId = normalizedSlug;
  const { data, error } = await req.adminDb.from('categories').insert({ id: categoryId, ...payload }).select('id,name,slug,icon,is_active,display_order').single();
  if (error) return res.status(error.code === '23505' ? 409 : 500).json({ success: false, error: error.code === '23505' ? 'Danh mục hoặc slug đã tồn tại.' : 'Không thể tạo danh mục.' });
  return res.status(201).json({ success: true, data });
}

export async function getAdminUsers(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const { data, error } = await req.adminDb.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const pageUsers = data.users || [];
    const { data: profiles, error: profileError } = pageUsers.length
      ? await req.adminDb.from('profiles').select('id,role').in('id', pageUsers.map((user) => user.id))
      : { data: [], error: null };
    if (profileError) throw profileError;
    const roleById = new Map((profiles || []).map((profile) => [profile.id, profile.role]));
    const users = pageUsers.map((user) => ({ id: user.id, email: user.email, full_name: user.user_metadata?.full_name || null, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at, role: roleById.get(user.id) || 'customer', banned_until: user.banned_until || null }));
    res.json({ success: true, data: users, total: data.total || users.length, page, limit: perPage });
  } catch (err) {
    console.error('[BE] getAdminUsers error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể tải tài khoản. Kiểm tra quyền service role.' });
  }
}

export async function updateAdminUserRole(req, res) {
  const { role } = req.body || {};
  if (!['admin', 'customer'].includes(role)) return res.status(400).json({ success: false, error: 'Vai trò không hợp lệ.' });
  if (req.params.id === req.user.id && role !== 'admin') return res.status(400).json({ success: false, error: 'Không thể tự hạ quyền admin của chính mình.' });
  try {
    const { count: adminCount, error: countError } = await req.adminDb.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin');
    if (countError) throw countError;
    const { data: targetProfile, error: targetProfileError } = await req.adminDb.from('profiles').select('role').eq('id', req.params.id).maybeSingle();
    if (targetProfileError) throw targetProfileError;
    if (!targetProfile) return res.status(404).json({ success: false, error: 'Không tìm thấy hồ sơ tài khoản.' });
    if (role !== 'admin' && targetProfile.role === 'admin' && (adminCount || 0) <= 1) return res.status(409).json({ success: false, error: 'Không thể hạ quyền admin cuối cùng.' });
    const { data: target, error: targetError } = await req.adminDb.auth.admin.getUserById(req.params.id);
    if (targetError || !target?.user) return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
    const { error: profileError } = await req.adminDb.from('profiles').update({ role }).eq('id', req.params.id);
    if (profileError) throw profileError;
    res.json({ success: true, data: { id: req.params.id, email: target.user.email, role } });
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
    const fields = ['name','slug','price','description','image_url','stock_quantity','origin','farming_standard','is_available','is_bestseller','nutrition_info'];
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
