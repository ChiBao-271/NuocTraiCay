import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';

const router = Router();

router.get('/profile/:userId', requireAuth, getUserProfile);
router.patch('/profile/:userId', requireAuth, updateUserProfile);

export default router;
