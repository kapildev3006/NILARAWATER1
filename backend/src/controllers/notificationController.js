const Notification = require('../models/Notification');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

exports.getNotifications = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments();
    
    // Auto-sync notifications from real database records if empty
    if (count === 0) {
      const notificationsToInsert = [];

      // 1. Real Orders
      const realOrders = await Order.find().populate('user').sort({ createdAt: -1 }).limit(5);
      for (const order of realOrders) {
        const customerName = order.user?.displayName || order.user?.email || 'Customer';
        const amountStr = order.totalPaise ? `₹${(order.totalPaise / 100).toFixed(0)}` : '';
        notificationsToInsert.push({
          type: 'order',
          title: 'New Order Received',
          message: `Order #${order.orderNumber} placed by ${customerName}${amountStr ? ' for ' + amountStr : ''}.`,
          isRead: false,
          link: `/orders`,
          referenceId: order._id.toString(),
          createdAt: order.createdAt || new Date()
        });
      }

      // 2. Real Support Tickets
      const realTickets = await Ticket.find().sort({ createdAt: -1 }).limit(5);
      for (const ticket of realTickets) {
        const user = await User.findById(ticket.userId);
        const isDelivery = user?.role === 'delivery';
        const roleLabel = isDelivery ? 'Delivery Partner' : 'Customer';
        notificationsToInsert.push({
          type: isDelivery ? 'delivery' : 'support',
          title: `${roleLabel} Support Ticket`,
          message: `${user?.displayName || 'User'} raised ticket: "${ticket.subject}"`,
          isRead: false,
          link: `/messages?ticketId=${ticket._id}&role=${user?.role || 'customer'}`,
          referenceId: ticket._id.toString(),
          createdAt: ticket.createdAt || new Date()
        });
      }

      // 3. Real Delivery Partners
      const riders = await User.find({ role: 'delivery' }).sort({ createdAt: -1 }).limit(3);
      for (const rider of riders) {
        notificationsToInsert.push({
          type: 'delivery',
          title: 'Delivery Partner Active',
          message: `${rider.displayName} (${rider.phone || rider.email}) is active as delivery partner.`,
          isRead: false,
          link: `/delivery-partners`,
          referenceId: rider._id.toString(),
          createdAt: rider.createdAt || new Date()
        });
      }

      // 4. System status
      notificationsToInsert.push({
        type: 'system',
        title: 'Nilara System Online',
        message: 'All system services, database, and real-time sockets operating normally.',
        isRead: true,
        link: `/settings`,
        createdAt: new Date()
      });

      if (notificationsToInsert.length > 0) {
        await Notification.insertMany(notificationsToInsert);
      }
    }

    const { type, unreadOnly } = req.query;
    const query = {};
    if (type && type !== 'all') {
      query.type = type;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

exports.createNotification = async (req, res, next) => {
  try {
    const { type, title, message, link, referenceId, data } = req.body;
    const notification = new Notification({
      type,
      title,
      message,
      link,
      referenceId,
      data
    });
    await notification.save();
    res.status(201).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
};

const { sendPushNotification } = require('../services/notificationService');

exports.testPush = async (req, res, next) => {
  try {
    const { token, tokens, userId, title, body, data } = req.body;
    
    const targetTokens = tokens || (token ? [token] : []);
    const pushTitle = title || 'Nilara Test Push Notification 🌊';
    const pushBody = body || 'FCM push notifications are active and working on your device!';

    const result = await sendPushNotification({
      userId,
      tokens: targetTokens,
      title: pushTitle,
      body: pushBody,
      data: data || { test: 'true', timestamp: new Date().toISOString() },
      type: 'system',
      saveToDb: true
    });

    res.status(200).json({
      success: result.success,
      message: 'Push notification test dispatched',
      result
    });
  } catch (error) {
    next(error);
  }
};

