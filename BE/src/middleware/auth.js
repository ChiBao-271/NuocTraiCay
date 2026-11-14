import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

const authClient = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập.' });

  const { data: { user }, error } = await authClient.auth.getUser(token);
  if (error || !user) return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });

  req.user = user;
  req.accessToken = token;
  req.userDb = createClient(config.supabaseUrl, config.supabaseKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  next();
}

export async function requireAdmin(req, res, next) {
  const userClient = createClient(config.supabaseUrl, config.supabaseKey, {
    global: { headers: { Authorization: `Bearer ${req.accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) return res.status(500).json({ success: false, error: 'Không thể xác minh quyền quản trị.' });
  if (data?.role !== 'admin') return res.status(403).json({ success: false, error: 'Bạn không có quyền quản trị.' });
  req.userRole = data.role;
  if (!config.supabaseServiceRoleKey) {
    return res.status(503).json({ success: false, error: 'Backend chưa được cấu hình quyền truy cập dữ liệu quản trị.' });
  }
  req.adminDb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  next();
}
