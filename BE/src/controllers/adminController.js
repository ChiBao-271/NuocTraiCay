// ──────────────────────────────────────────────────────
//  GET /api/admin/dashboard  — thống kê tổng quan
// ──────────────────────────────────────────────────────
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

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count });
  } catch (err) {
    console.error('[BE] getAllOrders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
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
  if (body.id !== undefined && body.id !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)) errors.push('ID sản phẩm phải là UUID hợp lệ.');
  if (body.slug !== undefined && (typeof body.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug))) errors.push('Slug chỉ dùng chữ thường, số và dấu gạch nối.');
  if (body.price !== undefined && (!Number.isInteger(Number(body.price)) || Number(body.price) < 0 || Number(body.price) > 2000000000)) errors.push('Giá sản phẩm không hợp lệ.');
  if (body.category_id !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.category_id)) errors.push('Danh mục sản phẩm không hợp lệ.');
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
    if (req.query.category && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.query.category)) query = query.eq('category_id', req.query.category);
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
    const { data, error } = await req.adminDb.from('categories').select('id,name,slug,is_active').order('name', { ascending: true });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[BE] getAdminCategories error:', err.message);
    res.status(500).json({ success: false, error: 'Không thể tải danh mục sản phẩm.' });
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
      ...(req.body.id ? { id: req.body.id.trim() } : {}), name: req.body.name.trim(), category_id: category.id,
      price: Number(req.body.price), slug: req.body.slug?.trim() || req.body.name.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
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
