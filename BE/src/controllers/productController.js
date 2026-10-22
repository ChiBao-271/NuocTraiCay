import * as productService from '../services/productService.js';

// ──────────────────────────────────────────────────────
//  GET /api/products
//  Lấy danh sách sản phẩm — hỗ trợ lọc, tìm kiếm, sort, phân trang
//
//  Query params:
//    category   — 'juice' | 'fresh-fruit' | 'combo' | 'all'
//    search / q — từ khóa tìm kiếm theo tên
//    minPrice   — giá tối thiểu (VND)
//    maxPrice   — giá tối đa (VND)
//    bestseller — '1' | 'true' → chỉ lấy sản phẩm bán chạy
//    sortBy     — 'newest'|'oldest'|'price_asc'|'price_desc'|'name_asc'|'name_desc'|'bestseller'
//    page       — trang hiện tại (mặc định: 1)
//    limit      — số SP/trang (mặc định: 20, tối đa: 100)
// ──────────────────────────────────────────────────────
export async function getProducts(req, res) {
  try {
    const result = await productService.getProducts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[BE] getProducts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/products/search
//  Tìm kiếm nâng cao — tìm theo cả tên VÀ mô tả sản phẩm
//
//  Query params:
//    q          — từ khóa (bắt buộc)
//    category   — lọc thêm theo danh mục (tùy chọn)
//    sortBy     — sắp xếp kết quả
//    page / limit — phân trang
// ──────────────────────────────────────────────────────
export async function searchProducts(req, res) {
  try {
    const result = await productService.searchProducts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[BE] searchProducts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/products/juice
//  Lấy danh sách nước ép với filter nâng cao
//
//  Query params:
//    minPrice / maxPrice — khoảng giá
//    bestseller          — chỉ bán chạy
//    search              — tìm trong nước ép
//    sortBy / page / limit
// ──────────────────────────────────────────────────────
export async function getJuiceProducts(req, res) {
  try {
    const result = await productService.getJuiceProducts(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[BE] getJuiceProducts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/products/:id
//  Lấy chi tiết 1 sản phẩm theo id
// ──────────────────────────────────────────────────────
export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    console.error('[BE] getProductById error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/products/:id/related
//  Lấy sản phẩm liên quan cùng danh mục
//
//  Query params:
//    limit — số sản phẩm gợi ý (mặc định: 4)
// ──────────────────────────────────────────────────────
export async function getRelatedProducts(req, res) {
  try {
    const { id } = req.params;
    const limit   = parseInt(req.query.limit, 10) || 4;

    // Lấy category_id của sản phẩm hiện tại
    const product = await productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy sản phẩm.' });
    }

    // Cần category_id gốc — gọi thêm Supabase để lấy raw field
    const { supabase } = await import('../supabase/client.js');
    const { data: raw } = await supabase
      .from('products')
      .select('category_id')
      .eq('id', id)
      .single();

    const related = await productService.getRelatedProducts(id, raw?.category_id, limit);
    res.json({ success: true, count: related.length, data: related });
  } catch (err) {
    console.error('[BE] getRelatedProducts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/categories
//  Lấy danh mục đang active
// ──────────────────────────────────────────────────────
export async function getCategories(req, res) {
  try {
    const data = await productService.getCategories();
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] getCategories error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

