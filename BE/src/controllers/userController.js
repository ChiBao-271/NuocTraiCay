import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

// Read the authenticated user's own profile through the server-only service
// role. The JWT is verified by requireAuth and userId is constrained to that
// same user below, so a missing profiles SELECT grant cannot hide the role.
function getProfileAdminDb() {
  if (!config.supabaseServiceRoleKey) return null;
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ──────────────────────────────────────────────────────
//  GET /api/users/profile/:userId  — lấy profile + role
// ──────────────────────────────────────────────────────
export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    if (userId !== req.user.id) return res.status(403).json({ success: false, error: 'Bạn không có quyền xem hồ sơ này.' });
    const profileDb = getProfileAdminDb();
    if (!profileDb) return res.status(503).json({ success: false, error: 'Backend chưa cấu hình SUPABASE_SERVICE_ROLE_KEY.' });

    const { data, error } = await profileDb
      .from('profiles')
      .select('id, full_name, phone, avatar_url, role, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Chưa có hồ sơ public.profiles cho tài khoản này. Hãy kiểm tra trigger tạo profile hoặc tạo profile rồi gán role admin.' });
      }
      throw error;
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] getUserProfile error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
