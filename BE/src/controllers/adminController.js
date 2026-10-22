import { supabase } from '../supabase/client.js';

// ──────────────────────────────────────────────────────
//  GET /api/admin/dashboard  — thống kê tổng quan
// ──────────────────────────────────────────────────────
export async function getDashboard(req, res) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [ordersRes, monthRes, customersRes, productsRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_code, recipient_name, total_amount, order_status, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('orders')
        .select('total_amount, order_status')
        .gte('created_at', startOfMonth),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_available', true),
    ]);

    const monthOrders = monthRes.data ?? [];
    const monthRevenue = monthOrders
      .filter((o) => o.order_status !== 'cancelled')
      .reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);

    const allOrders = ordersRes.data ?? [];
    const pendingOrders = allOrders.filter((o) => o.order_status === 'pending').length;

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: ordersRes.count ?? allOrders.length,
          pendingOrders,
          monthOrders: monthOrders.length,
          monthRevenue,
          totalCustomers: customersRes.count ?? 0,
          totalProducts: productsRes.count ?? 0,
        },
        recentOrders: allOrders,
      },
    });
  } catch (err) {
    console.error('[BE] getDashboard error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/admin/orders  — tất cả đơn hàng (có filter)
// ──────────────────────────────────────────────────────
export async function getAllOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const from = (page - 1) * limit;
    const to = from + Number(limit) - 1;

    let query = supabase
      .from('orders')
      .select('id, order_code, recipient_name, recipient_phone, total_amount, order_status, payment_status, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status && status !== 'all') {
      query = query.eq('order_status', status);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [], total: count });
  } catch (err) {
    console.error('[BE] getAllOrders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  PATCH /api/admin/orders/:id  — cập nhật trạng thái
// ──────────────────────────────────────────────────────
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { order_status } = req.body;

    if (!order_status) return res.status(400).json({ success: false, error: 'Thiếu order_status.' });

    const { data, error } = await supabase
      .from('orders')
      .update({ order_status })
      .eq('id', id)
      .select('id, order_code, order_status')
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[BE] updateOrderStatus error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
