const express = require('express');
const router = express.Router();
const { syncUser, adminLogin, validateAdminSession } = require('../controllers/authController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { authLimiter } = require('../middlewares/rateLimiter');

// Idempotent user sync route
router.post('/sync', authLimiter, requireAuth, syncUser);

// Admin login route
router.post('/admin-login', authLimiter, adminLogin);

// Admin session validation route
router.get('/validate-admin', requireAuth, validateAdminSession);

module.exports = router;
