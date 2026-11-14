import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getDashboard, getAllOrders, updateOrderStatus, getAdminProducts, getAdminCategories, createAdminProduct, updateAdminProduct, archiveAdminProduct } from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/orders', getAllOrders);
router.patch('/orders/:id', updateOrderStatus);
router.get('/products', getAdminProducts);
router.get('/categories', getAdminCategories);
router.post('/products', createAdminProduct);
router.patch('/products/:id', updateAdminProduct);
router.delete('/products/:id', archiveAdminProduct);

export default router;
