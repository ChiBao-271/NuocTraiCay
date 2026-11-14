// ─────────────────────────────────────────────────────────────
//  FE API client — mọi request đều đi qua BE, không gọi Supabase
// ─────────────────────────────────────────────────────────────
import { supabase } from '../supabase/client.js';

const BE_URL = process.env.NEXT_PUBLIC_BE_URL || 'http://localhost:5000';

async function apiFetch(path, options = {}) {
  // Public catalog requests should not wait for Supabase session recovery.
  const needsAuth = path.startsWith('/api/orders') || path.startsWith('/api/payments') || path.startsWith('/api/admin') || path.startsWith('/api/users');
  let accessToken;
  if (needsAuth && supabase) {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData?.session?.access_token;
  }
  const headers = { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) };
  const res = await fetch(`${BE_URL}${path}`, {
    headers,
    signal: AbortSignal.timeout(needsAuth ? 20000 : 10000),
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    const details = Array.isArray(json.errors) ? json.errors.filter((item) => typeof item === 'string' && item.trim()) : [];
    const message = details.length
      ? details.join(' ')
      : json.error || `API error ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    error.code = json.code || (json.error === 'ORDER_TOTAL_CHANGED' ? 'ORDER_TOTAL_CHANGED' : undefined);
    error.recalculated_total = json.recalculated_total ?? (json.error?.match?.(/ORDER_TOTAL_CHANGED:(\d+)/)?.[1] ? Number(json.error.match(/ORDER_TOTAL_CHANGED:(\d+)/)[1]) : undefined);
    throw error;
  }
  return json.data;
}

// ──────────────────────────────────────────────────────
//  Dữ liệu tĩnh fallback (hiển thị khi BE chưa kết nối)
// ──────────────────────────────────────────────────────
export const fallbackProducts = [
  {
    id: 'orange-juice-01',
    name: 'Citrus Punch',
    category: 'juice',
    price: 35000,
    unit: '350ml',
    badge: 'Bán chạy',
    image: '🍊',
    fruit: '🍋',
    accent: '#ffd782',
    gradient: 'linear-gradient(155deg, #fff8dc 0%, #ffe5a8 45%, #ffd16f 100%)',
    description: 'Cam vàng, chanh mật ong và bạc hà ép lạnh, vị chua ngọt bừng tỉnh.',
  },
  {
    id: 'apple-juice-01',
    name: 'Green Glow Detox',
    category: 'juice',
    price: 39000,
    unit: '350ml',
    badge: 'Mới',
    image: '🍏',
    fruit: '🥝',
    accent: '#bff59b',
    gradient: 'linear-gradient(155deg, #f8fff0 0%, #dfffd2 45%, #9af09c 100%)',
    description: 'Táo xanh, cần tây, rau bina và lê cho buổi sáng detox nhẹ nhàng.',
  },
  {
    id: 'mango-juice-01',
    name: 'Mango Sunrise',
    category: 'juice',
    price: 42000,
    unit: '350ml',
    badge: 'Ngọt dịu',
    image: '🥭',
    fruit: '🍍',
    accent: '#ffb55e',
    gradient: 'linear-gradient(155deg, #fff6d6 0%, #ffd28d 48%, #ff9d68 100%)',
    description: 'Xoài chín, dứa vàng và cam ép tạo lớp vị nhiệt đới thơm mượt.',
  },
  {
    id: 'strawberry-01',
    name: 'Sparkling Strawberry Orchard',
    category: 'fresh-fruit',
    price: 109000,
    unit: 'combo',
    badge: 'Tươi trong ngày',
    image: '🍓',
    fruit: '🌿',
    accent: '#ff7d7d',
    gradient: 'linear-gradient(155deg, #fff9dc 0%, #ffc9a8 46%, #ff7a76 100%)',
    description: 'Dâu tây Đà Lạt tuyển chọn kèm sparkling juice vị ngọt thanh.',
  },
  {
    id: 'banana-01',
    name: 'Ruby Guava Sparkle',
    category: 'fresh-fruit',
    price: 69000,
    unit: 'set',
    badge: 'Giá tốt',
    image: '🍐',
    fruit: '🍃',
    accent: '#97f4ac',
    gradient: 'linear-gradient(155deg, #ffffed 0%, #dbffc8 48%, #87ef9d 100%)',
    description: 'Ổi ruby ruột hồng kết hợp nước ép xanh, hậu vị mát và giàu vitamin C.',
  },
  {
    id: 'watermelon-01',
    name: 'Royal Mangosteen Sparkle',
    category: 'fresh-fruit',
    price: 119000,
    unit: 'combo',
    badge: 'Mọng nước',
    image: '🟣',
    fruit: '🍃',
    accent: '#c7b9ff',
    gradient: 'linear-gradient(155deg, #fffced 0%, #eadfff 48%, #b9aceb 100%)',
    description: 'Măng cụt chín mọng, nước ép tím dịu và lớp hương kem trái cây sang nhẹ.',
  },
  {
    id: 'family-combo-01',
    name: 'Family Fresh Box',
    category: 'combo',
    price: 159000,
    unit: 'set',
    badge: 'Tiết kiệm',
    image: '🧺',
    fruit: '🍇',
    accent: '#ffe087',
    gradient: 'linear-gradient(155deg, #fff8e7 0%, #ffe49f 48%, #ffc778 100%)',
    description: 'Trái cây theo mùa, 2 chai nước ép và voucher giảm 30% cho đơn sau.',
  },
  {
    id: 'office-combo-01',
    name: 'Office Juice Party',
    category: 'combo',
    price: 229000,
    unit: 'set',
    badge: 'Đặt nhóm',
    image: '🥤',
    fruit: '🍒',
    accent: '#a6e9ff',
    gradient: 'linear-gradient(155deg, #f4fdff 0%, #c7f3ff 48%, #9dddf9 100%)',
    description: '6 chai nước ép mix vị, giao lạnh tận văn phòng và tặng điểm Rewards.',
  },
];

export const categories = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: 'fresh-fruit', name: 'Trái cây tươi', icon: '🍓' },
  { id: 'juice', name: 'Nước ép', icon: '🧃' },
  { id: 'smoothie', name: 'Sinh tố', icon: '🥤' },
  { id: 'combo', name: 'Combo tiện lợi', icon: '🎁' },
];

// ──────────────────────────────────────────────────────
//  fetchProducts — gọi BE API, fallback local nếu lỗi
// ──────────────────────────────────────────────────────
export async function fetchProducts(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'all') query.set('category', params.category);
    if (params.search) query.set('search', params.search);
    const queryString = query.toString() ? `?${query.toString()}` : '';

    const data = await apiFetch(`/api/products${queryString}`);
    const liveProducts = Array.isArray(data) ? data : data?.data;
    if (!Array.isArray(liveProducts)) throw new Error('API trả dữ liệu sản phẩm không hợp lệ.');
    if (liveProducts.length) return { data: liveProducts, error: null, source: 'api' };
    let result = fallbackProducts;
    if (params.category && params.category !== 'all') result = result.filter((p) => p.category === params.category);
    return { data: result, error: null, source: 'empty-db' };
  } catch (error) {
    console.warn('[FE] fetchProducts fallback:', error.message);
    // Demo/fallback items have no live Supabase UUIDs, so never expose them as
    // buyable catalog data when the database/API is unavailable.
    return { data: [], error, source: 'unavailable' };
  }
}

// ──────────────────────────────────────────────────────
//  getProductById — lấy chi tiết sản phẩm theo ID
// ──────────────────────────────────────────────────────
export async function getProductById(id) {
  try {
    const data = await apiFetch(`/api/products/${id}`);
    return { data, error: null, source: 'api' };
  } catch (error) {
    console.warn('[FE] getProductById fallback:', error.message);
    return { data: null, error, source: 'unavailable' };
  }
}

// ──────────────────────────────────────────────────────
//  createOrder — gọi BE API
// ──────────────────────────────────────────────────────
export async function createOrder({ customer, items, total, note, userId, voucherCode }) {
  try {
    const data = await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ customer, items, total, note, userId, voucherCode }),
    });
    return { data, error: null };
  } catch (error) {
    if (error.status !== 409 && error.code !== 'ORDER_TOTAL_CHANGED') console.error('[FE] createOrder error:', error.message);
    return { data: null, error };
  }
}

export async function createSePayCheckout({ customer, items, total, note, voucherCode }) {
  try {
    const data = await apiFetch('/api/payments/sepay/checkout', {
      method: 'POST',
      body: JSON.stringify({ customer, items, total, note, voucherCode }),
    });
    return { data, error: null };
  } catch (error) {
    if (error.status !== 409 && error.code !== 'ORDER_TOTAL_CHANGED') console.error('[FE] createSePayCheckout error:', error.message);
    return { data: null, error };
  }
}

// ──────────────────────────────────────────────────────
//  fetchUserOrders — đơn hàng đã xác thực của người dùng
// ──────────────────────────────────────────────────────
export async function fetchUserOrders(userId, { page = 1, limit = 10, status = 'all' } = {}) {
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status });
    const data = await apiFetch(`/api/orders/user/${encodeURIComponent(userId)}?${query}`);
    return { data: data.data || [], total: data.total || 0, page: data.page || page, totalPages: data.totalPages || 0, error: null };
  } catch (error) {
    return { data: [], total: 0, page, totalPages: 0, error };
  }
}

export async function fetchOrderDetails(orderId) {
  try { return { data: await apiFetch(`/api/orders/${encodeURIComponent(orderId)}`), error: null }; }
  catch (error) { return { data: null, error }; }
}

export async function cancelUserOrder(orderId) {
  try {
    const data = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/cancel`, { method: 'PATCH', body: JSON.stringify({}) });
    return { data, error: null };
  } catch (error) { return { data: null, error }; }
}

// ──────────────────────────────────────────────────────
//  getUserProfile — lấy profile + role từ BE
// ──────────────────────────────────────────────────────
export async function getUserProfile(userId) {
  try {
    const data = await apiFetch(`/api/users/profile/${userId}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ──────────────────────────────────────────────────────
//  fetchAdminDashboard — gọi BE API
// ──────────────────────────────────────────────────────
export async function fetchAdminDashboard() {
  try {
    const data = await apiFetch('/api/admin/dashboard');
    return { data, error: null };
  } catch (error) {
    console.error('[FE] fetchAdminDashboard error:', error.message);
    return { data: null, error };
  }
}

export async function fetchAdminOrders({ page = 1, limit = 20, status = 'all' } = {}) {
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status });
    const result = await apiFetch(`/api/admin/orders?${query}`);
    return { data: result.data || [], total: result.total || 0, error: null };
  } catch (error) { return { data: [], total: 0, error }; }
}

export async function updateAdminOrderStatus(orderId, order_status) {
  try {
    const data = await apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, { method: 'PATCH', body: JSON.stringify({ order_status }) });
    return { data, error: null };
  } catch (error) { return { data: null, error }; }
}

export async function fetchAdminProducts({ page = 1, limit = 20, status = 'all', category = 'all' } = {}) {
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit), status, category });
    const result = await apiFetch(`/api/admin/products?${query}`);
    return { data: result.data || [], total: result.total || 0, totalPages: result.totalPages || 0, error: null };
  } catch (error) { return { data: [], total: 0, totalPages: 0, error }; }
}

export async function fetchAdminCategories() {
  try {
    const result = await apiFetch('/api/admin/categories');
    return { data: result || [], error: null };
  } catch (error) { return { data: [], error }; }
}

export async function saveAdminProduct(product, originalId = null) {
  try {
    const isUpdate = Boolean(originalId);
    const path = isUpdate ? `/api/admin/products/${encodeURIComponent(originalId)}` : '/api/admin/products';
    const data = await apiFetch(path, { method: isUpdate ? 'PATCH' : 'POST', body: JSON.stringify(product) });
    return { data, error: null };
  } catch (error) { return { data: null, error }; }
}

export async function archiveAdminProduct(productId) {
  try {
    const data = await apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' });
    return { data, error: null };
  } catch (error) { return { data: null, error }; }
}

// ──────────────────────────────────────────────────────
//  Utility
// ──────────────────────────────────────────────────────
export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}

// giữ lại export cũ để tránh lỗi import ở các file khác
export const products = fallbackProducts;
