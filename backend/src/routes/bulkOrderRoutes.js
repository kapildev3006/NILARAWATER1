const express = require('express');
const router = express.Router();
const bulkOrderController = require('../controllers/bulkOrderController');
const { requireAuth, optionalAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');

// Public route for creating bulk orders (since app may not enforce auth)
// We use optionalAuth to link the order to a user if they are logged in
router.post('/', optionalAuth, bulkOrderController.createBulkOrder);

// User routes
router.get('/my-orders', requireAuth, bulkOrderController.getMyBulkOrders);
router.patch('/:id/pay-advance', requireAuth, bulkOrderController.payAdvanceToken);
router.post('/:id/approve-quote', requireAuth, bulkOrderController.customerApproveQuote);

// Admin routes
router.get('/', requireAuth, requireRole('admin'), bulkOrderController.getBulkOrders);
router.post('/:id/quote', requireAuth, requireRole('admin'), bulkOrderController.submitQuote);
router.post('/:id/dispatch', requireAuth, requireRole('admin'), bulkOrderController.dispatchBulkOrder);
router.patch('/:id/status', requireAuth, requireRole('admin'), bulkOrderController.updateBulkOrderStatus);

module.exports = router;

