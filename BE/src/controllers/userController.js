import { supabase } from '../supabase/client.js';

// ──────────────────────────────────────────────────────
//  GET /api/users/profile/:userId  — lấy profile + role
// ──────────────────────────────────────────────────────
export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'Thiếu userId.' });

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, avatar_url, role, created_at')
      .eq('id', userId)
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] getUserProfile error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
