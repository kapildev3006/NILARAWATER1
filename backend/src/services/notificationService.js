const { messaging } = require('../config/firebase');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Universal FCM Push Notification Dispatcher
 * Works across:
 * 1. Foreground (App in active use) -> Flutter onMessage listener
 * 2. Background (App minimized) -> System tray push notification with sound & vibration
 * 3. Terminated (App killed / phone locked) -> High-priority wake-up notification
 */
const sendPushNotification = async ({
  userId,
  tokens = [],
  title,
  body,
  data = {},
  type = 'system',
  channelId = 'nilara_notifications',
  saveToDb = true,
  referenceId = '',
  link = ''
}) => {
  try {
    let targetTokens = Array.isArray(tokens) ? [...tokens] : (tokens ? [tokens] : []);
    let userDoc = null;

    if (userId) {
      userDoc = await User.findById(userId).select('fcmTokens displayName email phone').lean();
      if (userDoc && Array.isArray(userDoc.fcmTokens)) {
        targetTokens = [...new Set([...targetTokens, ...userDoc.fcmTokens])];
      }
    }

    // Filter out invalid/empty tokens
    targetTokens = targetTokens.filter(t => typeof t === 'string' && t.trim().length > 10);

    // Save notification to MongoDB in-app inbox
    if (saveToDb) {
      try {
        await Notification.create({
          type: type || 'system',
          title: title || 'Nilara Notification',
          message: body || '',
          link: link || '',
          referenceId: referenceId || (data?.orderId || ''),
          data: data || {},
          isRead: false
        });
      } catch (dbErr) {
        console.error('[NotificationService] Failed to save notification to DB:', dbErr.message);
      }
    }

    if (!messaging) {
      console.warn('[NotificationService] Firebase Messaging is not initialized. Skipping FCM push.');
      return { success: false, reason: 'Firebase Messaging not initialized', tokensCount: targetTokens.length };
    }

    if (targetTokens.length === 0) {
      console.log(`[NotificationService] No FCM device tokens found for target user ${userId || 'unknown'}. Notification saved to DB only.`);
      return { success: true, delivered: false, reason: 'No registered FCM tokens', count: 0 };
    }

    // Stringify all data properties for Firebase data payload (FCM requirement: keys & values must be strings)
    const sanitizedData = {};
    for (const [key, value] of Object.entries(data || {})) {
      if (value !== undefined && value !== null) {
        sanitizedData[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }
    sanitizedData.title = String(title || '');
    sanitizedData.body = String(body || '');
    sanitizedData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

    const message = {
      notification: {
        title: title || 'Nilara Update',
        body: body || ''
      },
      data: sanitizedData,
      android: {
        priority: 'high',
        notification: {
          channelId: channelId || 'nilara_notifications',
          sound: 'default',
          defaultSound: true,
          defaultVibrateTimings: true,
          priority: 'high',
          visibility: 'public'
        }
      },
      apns: {
        headers: {
          'apns-priority': '10'
        },
        payload: {
          aps: {
            alert: {
              title: title || 'Nilara Update',
              body: body || ''
            },
            sound: 'default',
            contentAvailable: true,
            badge: 1
          }
        }
      },
      tokens: targetTokens
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`[NotificationService] Push sent to ${targetTokens.length} tokens. Success: ${response.successCount}, Failures: ${response.failureCount}`);

    // Clean up stale or unregistered tokens from DB
    if (response.failureCount > 0 && userId) {
      const tokensToRemove = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            tokensToRemove.push(targetTokens[idx]);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`[NotificationService] Pruning ${tokensToRemove.length} stale FCM tokens for user ${userId}`);
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: tokensToRemove } }
        });
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('[NotificationService] Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Triggered when a customer places an order
 */
const notifyCustomerOrderPlaced = async (order) => {
  if (!order || !order.user) return;
  const userId = order.user._id ? order.user._id.toString() : order.user.toString();
  const orderNumber = order.orderNumber || order._id.toString().slice(-6);

  await sendPushNotification({
    userId,
    title: 'Order Confirmed! 🌊',
    body: `Your order #${orderNumber} has been received and is being prepared.`,
    data: {
      type: 'ORDER_PLACED',
      orderId: order._id.toString(),
      orderNumber: String(orderNumber)
    },
    type: 'order',
    referenceId: order._id.toString(),
    link: `/orders/${order._id}`
  });
};

/**
 * Triggered when order status changes (PREPARING, DISPATCHED, OUT_FOR_DELIVERY, DELIVERED, CANCELLED)
 */
const notifyCustomerOrderStatus = async (order, status) => {
  if (!order || !order.user) return;
  const userId = order.user._id ? order.user._id.toString() : order.user.toString();
  const orderNumber = order.orderNumber || order._id.toString().slice(-6);

  const statusTitles = {
    'confirmed': 'Order Confirmed! 📦',
    'preparing': 'Packing Your Order 💧',
    'out_for_delivery': 'Out for Delivery! 🚚',
    'delivered': 'Order Delivered! ✅',
    'cancelled': 'Order Cancelled ❌'
  };

  const statusBodies = {
    'confirmed': `Order #${orderNumber} is confirmed and scheduled for processing.`,
    'preparing': `Your pure water order #${orderNumber} is now being prepared for dispatch.`,
    'out_for_delivery': `Our delivery partner is on the way with your order #${orderNumber}!`,
    'delivered': `Order #${orderNumber} has been delivered successfully. Thank you for choosing Nilara!`,
    'cancelled': `Order #${orderNumber} was cancelled. Any prepaid amount will be refunded.`
  };

  const title = statusTitles[status.toLowerCase()] || `Order Status: ${status.toUpperCase()}`;
  const body = statusBodies[status.toLowerCase()] || `Your order #${orderNumber} status changed to ${status}.`;

  await sendPushNotification({
    userId,
    title,
    body,
    data: {
      type: 'ORDER_STATUS_UPDATE',
      orderId: order._id.toString(),
      orderNumber: String(orderNumber),
      status: String(status)
    },
    type: 'order',
    referenceId: order._id.toString(),
    link: `/orders/${order._id}`
  });
};

/**
 * Triggered when a rider is targeted for a 30s exclusive order offer
 */
const notifyRiderOrderOffered = async (riderId, order, expiresInSeconds = 30) => {
  if (!riderId || !order) return;
  const riderIdStr = riderId._id ? riderId._id.toString() : riderId.toString();
  const orderNumber = order.orderNumber || order._id.toString().slice(-6);

  await sendPushNotification({
    userId: riderIdStr,
    title: '🔔 New Delivery Offer Available!',
    body: `Order #${orderNumber} nearby. Tap to review and accept within ${expiresInSeconds}s!`,
    data: {
      type: 'TARGETED_DELIVERY_REQUEST',
      orderId: order._id.toString(),
      orderNumber: String(orderNumber),
      expiresIn: String(expiresInSeconds)
    },
    type: 'delivery',
    channelId: 'nilara_delivery_alerts',
    referenceId: order._id.toString(),
    link: `/active-delivery`
  });
};

/**
 * Triggered when a delivery partner is officially assigned to a customer's order
 */
const notifyCustomerDriverAssigned = async (order, driverName = 'Delivery Partner') => {
  if (!order || !order.user) return;
  const userId = order.user._id ? order.user._id.toString() : order.user.toString();
  const orderNumber = order.orderNumber || order._id.toString().slice(-6);

  await sendPushNotification({
    userId,
    title: 'Rider Assigned! 🛵',
    body: `${driverName} has been assigned to deliver your order #${orderNumber}.`,
    data: {
      type: 'DRIVER_ASSIGNED',
      orderId: order._id.toString(),
      orderNumber: String(orderNumber),
      driverName: String(driverName)
    },
    type: 'order',
    referenceId: order._id.toString(),
    link: `/orders/${order._id}`
  });
};

/**
 * Triggered when admin submits a quotation for bulk commercial orders
 */
const notifyCustomerBulkOrderQuote = async (bulkOrder) => {
  if (!bulkOrder || !bulkOrder.user) return;
  const userId = bulkOrder.user._id ? bulkOrder.user._id.toString() : bulkOrder.user.toString();
  const quoteNumber = bulkOrder.quoteNumber || bulkOrder._id.toString().slice(-6);

  await sendPushNotification({
    userId,
    title: 'Commercial Bulk Quote Ready! 💼',
    body: `Admin provided pricing for your quotation #${quoteNumber}. Review and accept now.`,
    data: {
      type: 'BULK_QUOTE_READY',
      bulkOrderId: bulkOrder._id.toString(),
      quoteNumber: String(quoteNumber)
    },
    type: 'order',
    referenceId: bulkOrder._id.toString(),
    link: `/bulk-orders`
  });
};

module.exports = {
  sendPushNotification,
  notifyCustomerOrderPlaced,
  notifyCustomerOrderStatus,
  notifyRiderOrderOffered,
  notifyCustomerDriverAssigned,
  notifyCustomerBulkOrderQuote
};
