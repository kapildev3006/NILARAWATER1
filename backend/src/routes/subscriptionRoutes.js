const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const subscriptionController = require('../controllers/subscriptionController');

// User routes
router.post('/', requireAuth, subscriptionController.createSubscription);
router.get('/my-subscriptions', requireAuth, subscriptionController.getMySubscriptions);
router.patch('/:id/user-status', requireAuth, subscriptionController.updateMySubscriptionStatus);
router.patch('/:id/skip', requireAuth, subscriptionController.skipNextDelivery);
router.patch('/:id/reschedule', requireAuth, subscriptionController.rescheduleDelivery);
router.patch('/:id/preferences', requireAuth, subscriptionController.updatePreferences);

// Admin routes
router.get('/', requireAuth, requireRole('admin'), subscriptionController.getAllSubscriptions);
router.patch('/:id/status', requireAuth, requireRole('admin'), subscriptionController.updateSubscriptionStatus);
router.patch('/:id/assign-driver', requireAuth, requireRole('admin'), subscriptionController.assignDeliveryPartner);

// Also let users cancel/suspend their own subscriptions? Usually users can pause/cancel
// We can use the same route or a different one. Let's keep it simple: users can't cancel right now, they have to contact admin, OR we just let them. The requirement says "allow admin to perform operations".
// If users need it too, we could remove the admin middleware from the PATCH route and add ownership check in controller, but let's stick to admin-only for now as per plan.

module.exports = router;
