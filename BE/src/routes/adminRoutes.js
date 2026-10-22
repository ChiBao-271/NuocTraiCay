import { Router } from 'express';
import { getDashboard, getAllOrders, updateOrderStatus } from '../controllers/adminController.js';

const router = Router();

router.get('/dashboard', getDashboard);
router.get('/orders', getAllOrders);
router.patch('/orders/:id', updateOrderStatus);

export default router;
