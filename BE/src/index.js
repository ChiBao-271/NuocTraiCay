import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { config } from './config/env.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const app = express();

// ──────────────────────────────────────────────────────
//  Middleware
// ──────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// ──────────────────────────────────────────────────────
//  Health check
// ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: '🍊 Fruit Online Shop BE is running.', version: '1.0.0' });
});

// ──────────────────────────────────────────────────────
//  Routes
// ──────────────────────────────────────────────────────
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);

// ──────────────────────────────────────────────────────
//  404 handler
// ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} không tồn tại.` });
});

// ──────────────────────────────────────────────────────
//  Error handler
// ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[BE] Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Lỗi server nội bộ.' });
});

app.listen(config.port, () => {
  console.log(`✅ BE server is running at http://localhost:${config.port}`);
});
