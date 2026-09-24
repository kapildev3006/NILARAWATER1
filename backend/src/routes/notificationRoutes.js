const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middlewares/authMiddleware');
const notificationController = require('../controllers/notificationController');

// Push diagnostic / testing endpoint
router.post('/test-push', notificationController.testPush);

router.use(requireAuth);

router.get('/', notificationController.getNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:id/read', notificationController.markAsRead);
router.post('/', notificationController.createNotification);

module.exports = router;
