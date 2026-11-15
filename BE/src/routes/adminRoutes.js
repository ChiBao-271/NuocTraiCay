import { Router, raw } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { getDashboard, getAllOrders, getAdminOrderDetails, updateOrderStatus, getAdminProducts, getAdminCategories, saveAdminCategory, getAdminUsers, updateAdminUserRole, createAdminProduct, updateAdminProduct, archiveAdminProduct, uploadProductImage } from '../controllers/adminController.js';

const router = Router();
router.use(requireAuth, requireAdmin);
router.post('/uploads/product-image', raw({ type: 'image/*', limit: '5mb' }), uploadProductImage);

router.get('/dashboard', getDashboard);
router.get('/orders', getAllOrders);
router.get('/orders/:id', getAdminOrderDetails);
router.patch('/orders/:id', updateOrderStatus);
router.get('/products', getAdminProducts);
router.get('/categories', getAdminCategories);
router.post('/categories', saveAdminCategory);
router.patch('/categories/:id', saveAdminCategory);
router.get('/users', getAdminUsers);
router.patch('/users/:id/role', updateAdminUserRole);
router.post('/products', createAdminProduct);
router.patch('/products/:id', updateAdminProduct);
router.delete('/products/:id', archiveAdminProduct);

export default router;
