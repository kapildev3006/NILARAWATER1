require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const { Server } = require('socket.io');

const requestLogger = require('./middlewares/requestLogger');
const errorHandler = require('./middlewares/errorHandler');
const { PUBLIC_STANDARD } = require('./middlewares/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const addressRoutes = require('./routes/addressRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const bulkOrderRoutes = require('./routes/bulkOrderRoutes');
const marketingRoutes = require('./routes/marketingRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const chatRoutes = require('./routes/chatRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const cartRoutes = require('./routes/cartRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const httpServer = createServer(app);

// ── Proxy Trust ──────────────────────────────────────────────────────────
// When behind reverse proxies like Render, Cloudflare, or AWS ALB:
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  app.set('trust proxy', 1);
}
// ─────────────────────────────────────────────────────────────────────────

// ── CORS ─────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true); // Allow ALL origins in development
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// ── Security Headers ─────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // API server, not embedding resources
}));

// ── Request ID & Logging ─────────────────────────────────────────────────
app.use(requestLogger);

// ── Request parsing & body size limits ───────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// ── Global Rate Limiting ─────────────────────────────────────────────────
app.use('/api', PUBLIC_STANDARD);

const initSocket = require('./config/socket');

// ── Socket.io initialization ─────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});
app.set('io', io);
initSocket(io);

// ── Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/delivery', deliveryRoutes);
app.use('/api/v1/bulk-orders', bulkOrderRoutes);
app.use('/api/v1/marketing', marketingRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/chat', chatRoutes); // Keep for backwards compatibility if needed, but tickets will take over
app.use('/api/v1/tickets', ticketRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/cart', cartRoutes);
app.use('/api/v1/notifications', notificationRoutes);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy', requestId: req.requestId });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    requestId: req.requestId
  });
});

// ── Centralized Error Handler ────────────────────────────────────────────
app.use(errorHandler);

// ── Database Connection ──────────────────────────────────────────────────
if (require.main === module) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected successfully');
      const PORT = process.env.PORT || 5000;
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      process.exit(1);
    });
}

module.exports = app;



 
 
 
 
