import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createSePayCheckout, receiveSePayIpn } from '../controllers/paymentController.js';

const router = Router();

// User-authenticated endpoint creates DB-backed pending order then returns signed SePay form.
router.post('/sepay/checkout', requireAuth, createSePayCheckout);
// Public callback, protected by SePay's configured X-Secret-Key.
router.post('/sepay/ipn', receiveSePayIpn);

export default router;
