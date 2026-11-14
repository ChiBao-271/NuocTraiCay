import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  createOrder,
  getOrderById,
  getUserOrders,
  cancelOrder,
} from '../controllers/orderController.js';

const router = Router();

// POST   /api/orders              — Tạo đơn hàng mới
router.post('/', requireAuth, createOrder);

// GET    /api/orders/user/:userId — Lịch sử đơn của user (?page&limit&status)
router.get('/user/:userId', requireAuth, getUserOrders);

// GET    /api/orders/:id          — Chi tiết 1 đơn hàng (kèm items)
router.get('/:id', requireAuth, getOrderById);

// PATCH  /api/orders/:id/cancel   — Huỷ đơn hàng
router.patch('/:id/cancel', requireAuth, cancelOrder);

export default router;
