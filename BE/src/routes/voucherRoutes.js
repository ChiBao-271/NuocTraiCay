import { Router } from 'express';
import { getPublicVouchers, validateVoucher } from '../controllers/voucherController.js';

const router = Router();
router.get('/', getPublicVouchers);
router.post('/validate', validateVoucher);

export default router;

