import { supabase } from '../supabase/client.js';

// ──────────────────────────────────────────────────────
//  POST /api/orders  — tạo đơn hàng
// ──────────────────────────────────────────────────────
export async function createOrder(req, res) {
  try {
    const { customer, items, total, note, userId } = req.body;

    if (!customer || !items || !total) {
      return res.status(400).json({ success: false, error: 'Thiếu thông tin đơn hàng.' });
    }

    // Insert order
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        recipient_name: customer.fullName,
        recipient_phone: customer.phone,
        shipping_address: customer.address,
        note: customer.note || note || null,
        subtotal: total,
        total_amount: total,
        shipping_fee: 0,
        discount_amount: 0,
        coins_used: 0,
        coins_earned: 0,
        order_status: 'pending',
        payment_method: 'cod',
        payment_status: 'unpaid',
      })
      .select('id, order_code, total_amount, order_status, created_at')
      .single();

    if (orderError) throw orderError;

    // Insert order_items
    if (orderData?.id && items?.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: orderData.id,
          product_id: item.id,
          product_name: item.name,
          unit_price: item.price,
          quantity: item.quantity,
          item_subtotal: item.price * item.quantity,
        }))
      );

      if (itemsError) {
        console.warn('[BE] order_items insert warning:', itemsError.message);
      }
    }

    res.status(201).json({ success: true, data: orderData });
  } catch (err) {
    console.error('[BE] createOrder error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}

// ──────────────────────────────────────────────────────
//  GET /api/orders/user/:userId  — lịch sử đơn của user
// ──────────────────────────────────────────────────────
export async function getUserOrders(req, res) {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ success: false, error: 'Thiếu userId.' });

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_code, total_amount, order_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[BE] getUserOrders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
}
