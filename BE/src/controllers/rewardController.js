import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

function serviceClient() {
  if (!config.supabaseServiceRoleKey) return null;
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// POST /api/users/rewards/checkin — điểm danh mỗi ngày cộng 5 xu thật.
export async function claimDailyCheckin(req, res) {
  const db = serviceClient();
  if (!db) {
    return res.status(503).json({ success: false, error: 'Backend chưa cấu hình quyền máy chủ để cộng xu.' });
  }
  try {
    const { data, error } = await db.rpc('claim_daily_checkin', { p_user_id: req.user.id });
    if (error) {
      const message = String(error.message || '');
      if (message.includes('ALREADY_CHECKED_IN')) {
        const { data: profile } = await db.from('profiles').select('coins').eq('id', req.user.id).maybeSingle();
        return res.status(409).json({
          success: false,
          code: 'ALREADY_CHECKED_IN',
          error: 'Hôm nay bạn đã điểm danh rồi. Mai quay lại nhé!',
          coins: profile?.coins ?? null,
        });
      }
      if (error.code === '42883' || error.code === 'PGRST202' || error.code === '42P01') {
        return res.status(503).json({
          success: false,
          code: 'CHECKIN_NOT_READY',
          error: 'Chức năng điểm danh chưa được bật trong database. Cần chạy migration 006.',
        });
      }
      throw error;
    }
    return res.json({ success: true, data: { coins: Number(data ?? 0), awarded: 5 } });
  } catch (err) {
    console.error('[BE] claimDailyCheckin:', err.code, err.message);
    return res.status(500).json({ success: false, error: 'Không điểm danh được lúc này. Vui lòng thử lại.' });
  }
}

