import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUserProfile, updateUserProfile } from '../controllers/userController.js';
import { claimDailyCheckin } from '../controllers/rewardController.js';

const router = Router();

router.get('/profile/:userId', requireAuth, getUserProfile);
router.patch('/profile/:userId', requireAuth, updateUserProfile);
router.post('/rewards/checkin', requireAuth, claimDailyCheckin);

export default router;
