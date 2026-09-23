import { isSupabaseConfigured, supabase } from '../supabase/client.js';

export const products = [
  {
    id: 'orange-juice-01',
    name: 'Citrus Punch',
    category: 'juice',
    price: 35000,
    unit: '350ml',
    badge: 'Bán chạy',
    image: '🍊',
    fruit: '🍋',
    accent: '#ffd782',
    gradient: 'linear-gradient(155deg, #fff8dc 0%, #ffe5a8 45%, #ffd16f 100%)',
    description: 'Cam vàng, chanh mật ong và bạc hà ép lạnh, vị chua ngọt bừng tỉnh.',
  },
  {
    id: 'apple-juice-01',
    name: 'Green Glow Detox',
    category: 'juice',
    price: 39000,
    unit: '350ml',
    badge: 'Mới',
    image: '🍏',
    fruit: '🥝',
    accent: '#bff59b',
    gradient: 'linear-gradient(155deg, #f8fff0 0%, #dfffd2 45%, #9af09c 100%)',
    description: 'Táo xanh, cần tây, rau bina và lê cho buổi sáng detox nhẹ nhàng.',
  },
  {
    id: 'mango-juice-01',
    name: 'Mango Sunrise',
    category: 'juice',
    price: 42000,
    unit: '350ml',
    badge: 'Ngọt dịu',
    image: '🥭',
    fruit: '🍍',
    accent: '#ffb55e',
    gradient: 'linear-gradient(155deg, #fff6d6 0%, #ffd28d 48%, #ff9d68 100%)',
    description: 'Xoài chín, dứa vàng và cam ép tạo lớp vị nhiệt đới thơm mượt.',
  },
  {
    id: 'strawberry-01',
    name: 'Sparkling Strawberry Orchard',
    category: 'fresh-fruit',
    price: 109000,
    unit: 'combo',
    badge: 'Tươi trong ngày',
    image: '🍓',
    fruit: '🌿',
    accent: '#ff7d7d',
    gradient: 'linear-gradient(155deg, #fff9dc 0%, #ffc9a8 46%, #ff7a76 100%)',
    description: 'Dâu tây Đà Lạt tuyển chọn kèm sparkling juice vị ngọt thanh.',
  },
  {
    id: 'banana-01',
    name: 'Ruby Guava Sparkle',
    category: 'fresh-fruit',
    price: 69000,
    unit: 'set',
    badge: 'Giá tốt',
    image: '🍐',
    fruit: '🍃',
    accent: '#97f4ac',
    gradient: 'linear-gradient(155deg, #ffffed 0%, #dbffc8 48%, #87ef9d 100%)',
    description: 'Ổi ruby ruột hồng kết hợp nước ép xanh, hậu vị mát và giàu vitamin C.',
  },
  {
    id: 'watermelon-01',
    name: 'Royal Mangosteen Sparkle',
    category: 'fresh-fruit',
    price: 119000,
    unit: 'combo',
    badge: 'Mọng nước',
    image: '🟣',
    fruit: '🍃',
    accent: '#c7b9ff',
    gradient: 'linear-gradient(155deg, #fffced 0%, #eadfff 48%, #b9aceb 100%)',
    description: 'Măng cụt chín mọng, nước ép tím dịu và lớp hương kem trái cây sang nhẹ.',
  },
  {
    id: 'family-combo-01',
    name: 'Family Fresh Box',
    category: 'combo',
    price: 159000,
    unit: 'set',
    badge: 'Tiết kiệm',
    image: '🧺',
    fruit: '🍇',
    accent: '#ffe087',
    gradient: 'linear-gradient(155deg, #fff8e7 0%, #ffe49f 48%, #ffc778 100%)',
    description: 'Trái cây theo mùa, 2 chai nước ép và voucher giảm 30% cho đơn sau.',
  },
  {
    id: 'office-combo-01',
    name: 'Office Juice Party',
    category: 'combo',
    price: 229000,
    unit: 'set',
    badge: 'Đặt nhóm',
    image: '🥤',
    fruit: '🍒',
    accent: '#a6e9ff',
    gradient: 'linear-gradient(155deg, #f4fdff 0%, #c7f3ff 48%, #9dddf9 100%)',
    description: '6 chai nước ép mix vị, giao lạnh tận văn phòng và tặng điểm Rewards.',
  },
];

export const fallbackProducts = products;

export const categories = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: 'fresh-fruit', name: 'Trái cây tươi', icon: '🍓' },
  { id: 'juice', name: 'Nước ép', icon: '🧃' },
  { id: 'combo', name: 'Combo tiện lợi', icon: '🎁' },
];

const categorySlugMap = {
  'trai-cay-tuoi': 'fresh-fruit',
  'nuoc-ep-nguyen-chat': 'juice',
  'sinh-to-smoothie': 'juice',
  combo: 'combo',
};

function mapCategorySlug(slug = '') {
  if (categorySlugMap[slug]) return categorySlugMap[slug];
  if (slug.includes('nuoc-ep') || slug.includes('sinh-to') || slug.includes('smoothie')) return 'juice';
  if (slug.includes('combo') || slug.includes('hop-qua') || slug.includes('set')) return 'combo';
  return 'fresh-fruit';
}

function getProductVisuals(productName = '', category = 'fresh-fruit') {
  const lowerName = productName.toLowerCase();

  if (lowerName.includes('dưa') || lowerName.includes('dua')) {
    return { image: '🍉', fruit: '🌿', accent: '#6fdc7b' };
  }

  if (lowerName.includes('bưởi') || lowerName.includes('buoi')) {
    return { image: '🍈', fruit: '🍃', accent: '#b8e879' };
  }

  if (lowerName.includes('nho')) {
    return { image: '🍇', fruit: '🌿', accent: '#a98bff' };
  }

  if (lowerName.includes('cam') || lowerName.includes('quýt') || lowerName.includes('chanh')) {
    return { image: '🍊', fruit: '🍋', accent: '#ffb55e' };
  }

  if (lowerName.includes('xoài') || lowerName.includes('xoai')) {
    return { image: '🥭', fruit: '🍍', accent: '#ffc465' };
  }

  if (lowerName.includes('dâu') || lowerName.includes('dau')) {
    return { image: '🍓', fruit: '🌿', accent: '#ff7d7d' };
  }

  if (category === 'juice') {
    return { image: '🧃', fruit: '🍊', accent: '#ffb55e' };
  }

  if (category === 'combo') {
    return { image: '🧺', fruit: '🍇', accent: '#ffe087' };
  }

  return { image: '🍏', fruit: '🍃', accent: '#9ee88f' };
}

function buildGradient(accent) {
  return `linear-gradient(155deg, #fffdf1 0%, #f0ffd9 45%, ${accent} 100%)`;
}

function mapDatabaseProduct(product, categoryById) {
  const categoryRecord = categoryById.get(product.category_id);
  const category = mapCategorySlug(categoryRecord?.slug);
  const visuals = getProductVisuals(product.name, category);
  const description = product.description
    || [product.origin, product.farming_standard].filter(Boolean).join(' · ')
    || 'Sản phẩm tươi được đồng bộ từ Supabase.';

  return {
    id: product.id,
    name: product.name,
    category,
    price: Number(product.price ?? 0),
    unit: category === 'juice' ? 'chai' : 'kg',
    badge: product.is_bestseller ? 'Bán chạy' : product.farming_standard || categoryRecord?.name || 'Tươi mới',
    image: visuals.image,
    fruit: visuals.fruit,
    accent: visuals.accent,
    gradient: buildGradient(visuals.accent),
    description,
    imageUrl: product.image_url,
    rating: product.rating_avg,
    stockQuantity: product.stock_quantity,
  };
}

export async function fetchProducts() {
  if (!isSupabaseConfigured) {
    return { data: fallbackProducts, error: null, source: 'local' };
  }

  const { data: categoryRows } = await supabase
    .from('categories')
    .select('id,name,slug')
    .eq('is_active', true);

  const categoryById = new Map((categoryRows || []).map((category) => [category.id, category]));

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { data: fallbackProducts, error, source: 'fallback' };
  }

  const mappedProducts = (data || []).map((product) => mapDatabaseProduct(product, categoryById));

  return { data: mappedProducts.length ? mappedProducts : fallbackProducts, error: null, source: 'supabase' };
}

export async function createOrder({ customer, items, total, note }) {
  if (!isSupabaseConfigured) {
    return { data: null, error: new Error('Supabase chưa được cấu hình.') };
  }

  const { data, error } = await supabase
    .from('orders')
    .insert({
      customer_name: customer.fullName,
      customer_phone: customer.phone,
      customer_address: customer.address,
      note,
      total_amount: total,
      status: 'pending',
      items: items.map((item) => ({
        product_id: item.id,
        name: item.name,
        price: item.price,
        unit: item.unit,
        quantity: item.quantity,
      })),
    })
    .select('id,status,total_amount,created_at')
    .single();

  return { data, error };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
}
