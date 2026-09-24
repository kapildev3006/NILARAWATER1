const express = require('express');
const router = express.Router();

const { 
  getAllOrders, 
  updateOrderStatus, 
  acceptAndDispatchOrder, 
  assignOrderDriver,
  getAllDeliveryRoutes,
  triggerDailyBatchGeneration,
  assignRouteDriver,
  getAllCustomers, 
  toggleCustomerSuspension, 
  getDashboardStats, 
  getInventory, 
  getPayments, 
  getDeliverySchedule, 
  markDeliveryDelivered, 
  addDeliveryPartner, 
  getAllDeliveryPartners 
} = require('../controllers/adminController');
const reviewController = require('../controllers/reviewController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole } = require('../middlewares/rbacMiddleware');
const { validate } = require('../middlewares/validateMiddleware');
const { updateOrderStatusSchema } = require('../validators/orderValidators');
const { createDeliveryPartnerSchema } = require('../validators/userValidators');
const { objectIdParamSchema, paginationQuerySchema } = require('../validators/commonValidators');
const { ADMIN_STRICT } = require('../middlewares/rateLimiter');

// All routes here require Admin role
router.use(requireAuth);
router.use(requireRole('admin'));
router.use(ADMIN_STRICT);

// Dashboard
router.get('/dashboard', getDashboardStats);

// Delivery Calendar, Routes & Live Deliveries
router.get('/delivery-schedule', getDeliverySchedule);
router.get('/delivery-routes', getAllDeliveryRoutes);
router.post('/delivery-routes/generate-batches', triggerDailyBatchGeneration);
router.post('/delivery-routes/:id/assign-driver', validate({ params: objectIdParamSchema }), assignRouteDriver);
router.post('/live-deliveries/mark-delivered', markDeliveryDelivered);

// Orders
router.get('/orders', validate({ query: paginationQuerySchema }), getAllOrders);
router.get('/customers', getAllCustomers);
router.patch('/customers/:id/suspend', validate({ params: objectIdParamSchema }), toggleCustomerSuspension);
router.patch('/orders/:id/status', validate({ params: objectIdParamSchema, body: updateOrderStatusSchema }), updateOrderStatus);
router.patch('/orders/:id/accept-and-dispatch', validate({ params: objectIdParamSchema }), acceptAndDispatchOrder);
router.post('/orders/:id/assign-driver', validate({ params: objectIdParamSchema }), assignOrderDriver);

// Reviews
router.get('/reviews', reviewController.getAdminReviews);
router.patch('/reviews/:id/status', reviewController.updateReviewStatus);

// Inventory (derived from Products)
router.get('/inventory', getInventory);

// Payments (derived from Orders)
router.get('/payments', getPayments);

// Delivery Partners
router.post('/delivery-partners', validate({ body: createDeliveryPartnerSchema }), addDeliveryPartner);
router.get('/delivery-partners', getAllDeliveryPartners);

// Incentives & Campaigns
const incentiveController = require('../controllers/incentiveController');
router.get('/incentives', incentiveController.getAdminIncentives);
router.post('/incentives', incentiveController.createIncentive);
router.patch('/incentives/:id', incentiveController.updateIncentive);
router.delete('/incentives/:id', incentiveController.deleteIncentive);

module.exports = router;

