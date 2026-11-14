import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserProfile } from '../controllers/userController.js';

const router = Router();

router.get('/profile/:userId', requireAuth, getUserProfile);

export default router;
