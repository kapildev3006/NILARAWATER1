const express = require('express');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const router = express.Router();

const { 
  updateProfile, 
  completeOnboarding, 
  uploadRC, 
  getAvailableOrders, 
  acceptOrder, 
  updateDeliveryStatus, 
  getPreferences, 
  updatePreferences, 
  getMyOrders,
  getTodaysDeliveries,
  markSubscriptionDelivered,
  respondToOrderRequest,
  arrivedAtPickup,
  confirmPickup,
  arrivedAtCustomer,
  completeDeliveryStep,
  markCustomerUnavailable,
  getMyRoutes,
  startRoute,
  updateRouteStopStatus
} = require('../controllers/deliveryController');
const { getWalletData, requestPayout } = require('../controllers/walletController');
const { requireAuth, requireOnboarding } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { updateOrderStatusSchema } = require('../validators/orderValidators');
const { updatePreferencesSchema } = require('../validators/userValidators');
const { objectIdParamSchema, paginationQuerySchema } = require('../validators/commonValidators');
const { DELIVERY_STANDARD } = require('../middlewares/rateLimiter');

// Development test trigger for incoming order alert (unprotected)
router.post('/test-incoming-order', (req, res) => {
  const testOrder = {
    _id: '65f1234567890abcdef12345',
    totalPaise: 45000,
    deliveryAddress: { fullName: 'Test Customer', city: 'Delhi' },
    items: []
  };
  req.app.get('io').to('delivery_room').emit('new_order_available', testOrder);
  res.json({ success: true, message: 'Emitted new_order_available to delivery_room', order: testOrder });
});

// All routes here require Delivery role
router.use(requireAuth);
router.use(requireRole('delivery'));
router.use(DELIVERY_STANDARD);

// Profile & Preferences & Documents
router.put('/profile', updateProfile);
router.get('/preferences', getPreferences);
router.put('/preferences', validate({ body: updatePreferencesSchema }), updatePreferences);
router.post('/rc', upload.single('rcImage'), uploadRC);
router.post('/onboarding', upload.fields([
  { name: 'profileImage', maxCount: 1 },
  { name: 'aadharImage', maxCount: 1 },
  { name: 'drivingLicenseImage', maxCount: 1 },
  { name: 'vehicleFrontImage', maxCount: 1 },
  { name: 'vehicleBackImage', maxCount: 1 },
  { name: 'rcImage', maxCount: 1 }
]), completeOnboarding);

// Orders & Deliveries
router.get('/orders/available', requireOnboarding, validate({ query: paginationQuerySchema }), getAvailableOrders);
router.get('/orders/my-orders', requireOnboarding, getMyOrders);
router.get('/todays-deliveries', requireOnboarding, getTodaysDeliveries);
router.post('/orders/respond-request', requireOnboarding, respondToOrderRequest);
router.patch('/orders/:id/accept', requireOnboarding, validate({ params: objectIdParamSchema }), acceptOrder);
router.patch('/orders/:id/status', requireOnboarding, validate({ params: objectIdParamSchema, body: updateOrderStatusSchema }), updateDeliveryStatus);

// Normal Delivery Step-by-Step Progression
router.post('/orders/:id/arrived-pickup', requireOnboarding, validate({ params: objectIdParamSchema }), arrivedAtPickup);
router.post('/orders/:id/confirm-pickup', requireOnboarding, validate({ params: objectIdParamSchema }), confirmPickup);
router.post('/orders/:id/arrived-customer', requireOnboarding, validate({ params: objectIdParamSchema }), arrivedAtCustomer);
router.post('/orders/:id/complete-delivery', requireOnboarding, validate({ params: objectIdParamSchema }), completeDeliveryStep);
router.post('/orders/:id/customer-unavailable', requireOnboarding, validate({ params: objectIdParamSchema }), markCustomerUnavailable);

// Subscription Multi-Stop Routes
router.get('/routes/today', requireOnboarding, getMyRoutes);
router.post('/routes/:id/start', requireOnboarding, validate({ params: objectIdParamSchema }), startRoute);
router.post('/routes/:id/stops/:stopId/status', requireOnboarding, updateRouteStopStatus);

// Subscriptions
router.post('/subscriptions/:id/mark-delivered', requireOnboarding, validate({ params: objectIdParamSchema }), markSubscriptionDelivered);

// Wallet & Payouts
router.get('/wallet', requireOnboarding, getWalletData);
router.post('/wallet/payout', requireOnboarding, requestPayout);

// Incentives & Schemes
const { getDeliveryIncentives } = require('../controllers/incentiveController');
router.get('/incentives', requireOnboarding, getDeliveryIncentives);

module.exports = router;
