import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getCategories,
  searchProducts,
  getJuiceProducts,
  getRelatedProducts,
} from '../controllers/productController.js';

const router = Router();

// ── Danh sách & lọc ──────────────────────────────────
// GET /api/products                            — danh sách (filter + sort + pagination)
// GET /api/products?category=juice             — lọc theo danh mục
// GET /api/products?search=cam&minPrice=30000  — tìm kiếm + lọc giá
router.get('/', getProducts);

// ── Tìm kiếm nâng cao (tên + mô tả) ─────────────────
// GET /api/products/search?q=xoài
// GET /api/products/search?q=detox&category=juice
// QUAN TRỌNG: đặt trước /:id để không bị nhầm với id='search'
router.get('/search', searchProducts);

// ── Nước ép — filter nâng cao ────────────────────────
// GET /api/products/juice
// GET /api/products/juice?bestseller=true&maxPrice=45000&sortBy=price_asc
router.get('/juice', getJuiceProducts);

// ── Danh mục ─────────────────────────────────────────
// GET /api/categories  (mounted tại /api/products/categories)
router.get('/categories', getCategories);

// ── Chi tiết sản phẩm ────────────────────────────────
// GET /api/products/:id
router.get('/:id', getProductById);

// ── Sản phẩm liên quan ───────────────────────────────
// GET /api/products/:id/related?limit=4
router.get('/:id/related', getRelatedProducts);

export default router;
