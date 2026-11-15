import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  sepayEnv: process.env.SEPAY_ENV || 'sandbox',
  sepayMerchantId: process.env.SEPAY_MERCHANT_ID,
  sepaySecretKey: process.env.SEPAY_SECRET_KEY,
  sepayIpnSecret: process.env.SEPAY_IPN_SECRET_KEY,
  // Leave payment method unset by default so SePay can use the merchant's
  // enabled method(s) or render its method selector. Set explicitly only
  // after that method is enabled for this merchant/environment.
  sepayPaymentMethod: process.env.SEPAY_PAYMENT_METHOD || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  publicApiUrl: process.env.PUBLIC_API_URL,
};
