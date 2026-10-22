import { supabase } from '../supabase/client.js';

// ──────────────────────────────────────────────────────
//  Constants
// ──────────────────────────────────────────────────────

/** Map slug danh mục DB → category FE */
const CATEGORY_SLUG_MAP = {
  'trai-cay-tuoi': 'fresh-fruit',
  'nuoc-ep-nguyen-chat': 'juice',
  'sinh-to-smoothie': 'juice',
  combo: 'combo',
};

/** Các trường được phép sort */
const SORTABLE_FIELDS = {
  price_asc:   { column: 'price',        ascending: true  },
  price_desc:  { column: 'price',        ascending: false },
  name_asc:    { column: 'name',         ascending: true  },
  name_desc:   { column: 'name',         ascending: false },
  newest:      { column: 'created_at',   ascending: false },
  oldest:      { column: 'created_at',   ascending: true  },
  bestseller:  { column: 'is_bestseller',ascending: false },
};

// ──────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────

/**
 * Chuyển đổi slug danh mục DB → category FE
 * @param {string} slug
 * @returns {'fresh-fruit'|'juice'|'combo'}
 */
function resolveCategorySlug(slug = '') {
  if (CATEGORY_SLUG_MAP[slug]) return CATEGORY_SLUG_MAP[slug];
  if (slug.includes('nuoc-ep') || slug.includes('sinh-to') || slug.includes('smoothie'))
    return 'juice';
  if (slug.includes('combo') || slug.includes('hop-qua') || slug.includes('set'))
    return 'combo';
  return 'fresh-fruit';
}

/**
 * Xác định emoji & màu sắc dựa theo tên sản phẩm
 * @param {string} productName
 * @param {'fresh-fruit'|'juice'|'combo'} category
 * @returns {{ image: string, fruit: string, accent: string }}
 */
function resolveProductVisuals(productName = '', category = 'fresh-fruit') {
  const n = productName.toLowerCase();
  if (n.includes('dưa') || n.includes('dua'))     return { image: '🍉', fruit: '🌿', accent: '#6fdc7b' };
  if (n.includes('bưởi') || n.includes('buoi'))   return { image: '🍈', fruit: '🍃', accent: '#b8e879' };
  if (n.includes('nho'))                           return { image: '🍇', fruit: '🌿', accent: '#a98bff' };
  if (n.includes('cam') || n.includes('quýt') || n.includes('quyt') || n.includes('chanh'))
                                                    return { image: '🍊', fruit: '🍋', accent: '#ffb55e' };
  if (n.includes('xoài') || n.includes('xoai'))   return { image: '🥭', fruit: '🍍', accent: '#ffc465' };
  if (n.includes('dâu') || n.includes('dau'))     return { image: '🍓', fruit: '🌿', accent: '#ff7d7d' };
  if (n.includes('táo') || n.includes('tao'))     return { image: '🍎', fruit: '🍃', accent: '#ff6b6b' };
  if (n.includes('ổi') || n.includes('oi'))       return { image: '🍐', fruit: '🍃', accent: '#97f4ac' };
  if (n.includes('măng cụt') || n.includes('mang cut'))
                                                    return { image: '🟣', fruit: '🍃', accent: '#c7b9ff' };
  if (n.includes('dứa') || n.includes('khom'))    return { image: '🍍', fruit: '🌿', accent: '#ffe566' };
  if (category === 'juice')                        return { image: '🧃', fruit: '🍊', accent: '#ffb55e' };
  if (category === 'combo')                        return { image: '🧺', fruit: '🍇', accent: '#ffe087' };
  return { image: '🍏', fruit: '🍃', accent: '#9ee88f' };
}

/**
 * Tạo CSS gradient từ màu accent
 * @param {string} accent  hex color
 * @returns {string}
 */
function buildGradient(accent) {
  return `linear-gradient(155deg, #fffdf1 0%, #f0ffd9 45%, ${accent} 100%)`;
}

/**
 * Map 1 row products từ DB → shape dùng ở FE
 * @param {object}           product      — row từ bảng products
 * @param {Map<string,object>} categoryById — map id → category record
 * @returns {object}
 */
function mapProductRow(product, categoryById) {
  const categoryRecord = categoryById.get(product.category_id);
  const category       = resolveCategorySlug(categoryRecord?.slug);
  const visuals        = resolveProductVisuals(product.name, category);
  const description    =
    product.description ||
    [product.origin, product.farming_standard].filter(Boolean).join(' · ') ||
    'Sản phẩm tươi.';

  return {
    id:             product.id,
    name:           product.name,
    category,
    categoryName:   categoryRecord?.name ?? null,
    price:          Number(product.price ?? 0),
    unit:           category === 'juice' ? 'chai' : 'kg',
    badge:          product.is_bestseller
                      ? 'Bán chạy'
                      : (product.farming_standard || categoryRecord?.name || 'Tươi mới'),
    image:          visuals.image,
    fruit:          visuals.fruit,
    accent:         visuals.accent,
    gradient:       buildGradient(visuals.accent),
    description,
    imageUrl:       product.image_url       ?? null,
    rating:         product.rating_avg      ?? null,
    stockQuantity:  product.stock_quantity  ?? null,
    isBestseller:   product.is_bestseller   ?? false,
    origin:         product.origin          ?? null,
    farmingStandard:product.farming_standard ?? null,
    createdAt:      product.created_at,
  };
}

// ──────────────────────────────────────────────────────
//  Internal: load category map
// ──────────────────────────────────────────────────────

async function loadCategoryMap() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('is_active', true);

  if (error) throw error;
  return new Map((data || []).map((c) => [c.id, c]));
}

/**
 * Tính danh sách category_id tương ứng với category FE
 * @param {Map<string,object>} categoryById
 * @param {string}             feCategory   — 'juice' | 'fresh-fruit' | 'combo'
 * @returns {string[]}
 */
function resolveCategoryIds(categoryById, feCategory) {
  const ids = [];
  for (const [id, cat] of categoryById.entries()) {
    if (resolveCategorySlug(cat.slug) === feCategory) ids.push(id);
  }
  return ids;
}

// ──────────────────────────────────────────────────────
//  Service: getProducts
//  Lấy danh sách sản phẩm — hỗ trợ lọc, tìm kiếm, sort, phân trang
// ──────────────────────────────────────────────────────

/**
 * @typedef {object} GetProductsOptions
 * @property {string}              [category]   - 'juice'|'fresh-fruit'|'combo'|'all'
 * @property {string}              [search]     - từ khóa tìm theo tên (alias: q)
 * @property {string}              [q]          - alias của search
 * @property {number|string}       [minPrice]   - giá thấp nhất (VND)
 * @property {number|string}       [maxPrice]   - giá cao nhất (VND)
 * @property {boolean|string}      [bestseller] - chỉ lấy sản phẩm bán chạy
 * @property {'newest'|'oldest'|'price_asc'|'price_desc'|'name_asc'|'name_desc'|'bestseller'} [sortBy]
 * @property {number|string}       [page]       - trang hiện tại (≥1)
 * @property {number|string}       [limit]      - số SP/trang (mặc định 20, tối đa 100)
 */

/**
 * Lấy danh sách sản phẩm với đầy đủ filter / search / sort / pagination
 * @param {GetProductsOptions} opts
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, totalPages: number}>}
 */
export async function getProducts(opts = {}) {
  const {
    category,
    search,
    q,
    minPrice,
    maxPrice,
    bestseller,
    sortBy   = 'newest',
    page     = 1,
    limit: rawLimit = 20,
  } = opts;

  const searchTerm = (search || q || '').trim();
  const pageNum    = Math.max(1, parseInt(page,     10) || 1);
  const limitNum   = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
  const offset     = (pageNum - 1) * limitNum;

  // ── 1. Load categories ──────────────────────────────
  const categoryById = await loadCategoryMap();

  // ── 2. Build Supabase query ─────────────────────────
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_available', true);

  // Tìm kiếm theo tên (ilike — case-insensitive, có dấu)
  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  // Lọc giá
  if (minPrice !== undefined && minPrice !== null && minPrice !== '' && !isNaN(Number(minPrice))) {
    query = query.gte('price', Number(minPrice));
  }
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '' && !isNaN(Number(maxPrice))) {
    query = query.lte('price', Number(maxPrice));
  }

  // Lọc bestseller
  if (bestseller === true || bestseller === 'true' || bestseller === '1') {
    query = query.eq('is_bestseller', true);
  }

  // Lọc category — chuyển sang category_id để filter thẳng tại DB
  const normalizedCategory = category?.toLowerCase();
  if (normalizedCategory && normalizedCategory !== 'all') {
    const matchingIds = resolveCategoryIds(categoryById, normalizedCategory);
    if (matchingIds.length > 0) {
      query = query.in('category_id', matchingIds);
    }
  }

  // Sort
  const sortConfig = SORTABLE_FIELDS[sortBy] ?? SORTABLE_FIELDS.newest;
  query = query.order(sortConfig.column, { ascending: sortConfig.ascending });

  // Pagination
  query = query.range(offset, offset + limitNum - 1);

  // ── 3. Execute ──────────────────────────────────────
  const { data, error, count } = await query;
  if (error) throw error;

  const mapped     = (data || []).map((p) => mapProductRow(p, categoryById));
  const total      = count ?? 0;
  const totalPages = Math.ceil(total / limitNum);

  return { data: mapped, total, page: pageNum, limit: limitNum, totalPages };
}

// ──────────────────────────────────────────────────────
//  Service: getProductById
//  Lấy chi tiết 1 sản phẩm theo id
// ──────────────────────────────────────────────────────

/**
 * Lấy chi tiết sản phẩm theo id
 * @param {string} id
 * @returns {Promise<object|null>}  null nếu không tìm thấy
 */
export async function getProductById(id) {
  const [categoryById, productResult] = await Promise.all([
    loadCategoryMap(),
    supabase.from('products').select('*').eq('id', id).eq('is_available', true).single(),
  ]);

  const { data, error } = productResult;

  // PGRST116 = PostgREST "no rows found" (khi dùng .single())
  if (error?.code === 'PGRST116' || !data) return null;
  if (error) throw error;

  return mapProductRow(data, categoryById);
}

// ──────────────────────────────────────────────────────
//  Service: searchProducts
//  Tìm kiếm nâng cao — hỗ trợ cả tên VÀ mô tả sản phẩm
// ──────────────────────────────────────────────────────

/**
 * @typedef {object} SearchOptions
 * @property {string}         q          - từ khóa bắt buộc
 * @property {string}         [category] - lọc thêm theo danh mục
 * @property {string}         [sortBy]
 * @property {number|string}  [page]
 * @property {number|string}  [limit]
 */

/**
 * Tìm kiếm sản phẩm theo tên hoặc mô tả
 * @param {SearchOptions} opts
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, totalPages: number}>}
 */
export async function searchProducts(opts = {}) {
  const { q = '', category, sortBy = 'newest', page = 1, limit: rawLimit = 20 } = opts;
  const searchTerm = q.trim();

  const EMPTY_RESULT = { data: [], total: 0, page: 1, limit: Number(rawLimit) || 20, totalPages: 0 };
  if (!searchTerm) return EMPTY_RESULT;

  const pageNum  = Math.max(1, parseInt(page,     10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
  const offset   = (pageNum - 1) * limitNum;

  // ── Load categories ─────────────────────────────────
  const categoryById = await loadCategoryMap();

  // ── Build query ─────────────────────────────────────
  // Supabase .or() cho phép filter theo nhiều cột cùng lúc
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_available', true)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

  // Lọc theo category (optional)
  const normalizedCategory = category?.toLowerCase();
  if (normalizedCategory && normalizedCategory !== 'all') {
    const matchingIds = resolveCategoryIds(categoryById, normalizedCategory);
    if (matchingIds.length > 0) {
      query = query.in('category_id', matchingIds);
    }
  }

  // Sort & Pagination
  const sortConfig = SORTABLE_FIELDS[sortBy] ?? SORTABLE_FIELDS.newest;
  query = query
    .order(sortConfig.column, { ascending: sortConfig.ascending })
    .range(offset, offset + limitNum - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  const mapped     = (data || []).map((p) => mapProductRow(p, categoryById));
  const total      = count ?? 0;
  const totalPages = Math.ceil(total / limitNum);

  return { data: mapped, total, page: pageNum, limit: limitNum, totalPages };
}

// ──────────────────────────────────────────────────────
//  Service: getJuiceProducts
//  Lấy danh sách nước ép với lọc nâng cao (sugar-free, bestseller, giá...)
// ──────────────────────────────────────────────────────

/**
 * @typedef {object} JuiceFilterOptions
 * @property {number|string}  [minPrice]   - giá thấp nhất
 * @property {number|string}  [maxPrice]   - giá cao nhất
 * @property {boolean|string} [bestseller] - chỉ bán chạy
 * @property {string}         [search]     - tìm trong nước ép
 * @property {string}         [sortBy]
 * @property {number|string}  [page]
 * @property {number|string}  [limit]
 */

/**
 * Lấy danh sách sản phẩm nước ép với filter nâng cao
 * @param {JuiceFilterOptions} opts
 * @returns {Promise<{data: object[], total: number, page: number, limit: number, totalPages: number}>}
 */
export async function getJuiceProducts(opts = {}) {
  return getProducts({ ...opts, category: 'juice' });
}

// ──────────────────────────────────────────────────────
//  Service: getCategories
//  Lấy danh mục đang active
// ──────────────────────────────────────────────────────

/**
 * Lấy tất cả danh mục đang active, sắp theo display_order
 * @returns {Promise<object[]>}
 */
export async function getCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, icon')
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ──────────────────────────────────────────────────────
//  Service: getRelatedProducts
//  Gợi ý sản phẩm liên quan cùng danh mục
// ──────────────────────────────────────────────────────

/**
 * Lấy sản phẩm liên quan cùng danh mục (loại trừ sản phẩm hiện tại)
 * @param {string} productId    — id sản phẩm cần loại trừ
 * @param {string} categoryId   — category_id của sản phẩm
 * @param {number} [limit=4]    — số sản phẩm gợi ý tối đa
 * @returns {Promise<object[]>}
 */
export async function getRelatedProducts(productId, categoryId, limit = 4) {
  const categoryById = await loadCategoryMap();

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .eq('category_id', categoryId)
    .neq('id', productId)
    .order('is_bestseller', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((p) => mapProductRow(p, categoryById));
}
