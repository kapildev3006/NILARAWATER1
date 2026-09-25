/**
 * Dispatch Service
 * Manages atomic single-rider normal order assignment with 30-second lock and sequential fallback.
 * Prevents race conditions and guarantees that only one rider holds an active offer at any time.
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { notifyRiderOrderOffered, notifyCustomerDriverAssigned } = require('./notificationService');

// In-memory active dispatch timers and attempts tracking
// Key: orderId, Value: { currentRiderId, timer, attemptedRiders: Set }
const activeDispatchQueues = new Map();

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Initiates sequential partner search for a normal order
 * @param {string} orderId 
 * @param {Object} io - Socket.io server instance
 */
const startNormalOrderDispatch = async (orderId, io) => {
  try {
    const order = await Order.findById(orderId).populate('user', 'displayName phone');
    if (!order) return;

    // Check if order is already assigned or completed
    if (order.deliveryPartner || ['ASSIGNED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.deliveryStatus)) {
      return;
    }

    // Ensure a corresponding Delivery instance exists
    let delivery = await Delivery.findOne({ orderId: order._id });
    if (!delivery) {
      delivery = await Delivery.create({
        deliveryNumber: `DEL-${order.orderNumber.replace('ORD-', '')}`,
        orderType: 'NORMAL',
        orderId: order._id,
        customer: order.user._id,
        scheduledDate: new Date(),
        deliveryAddress: {
          recipientName: order.deliveryAddressSnapshot?.recipientName || order.user.displayName,
          phone: order.deliveryAddressSnapshot?.phone || order.user.phone,
          addressLine1: order.deliveryAddressSnapshot?.addressLine1,
          addressLine2: order.deliveryAddressSnapshot?.addressLine2,
          city: order.deliveryAddressSnapshot?.city,
          state: order.deliveryAddressSnapshot?.state,
          postalCode: order.deliveryAddressSnapshot?.postalCode,
          area: order.deliveryAddressSnapshot?.city || 'Local Area',
          coordinates: order.deliveryAddressSnapshot?.location?.coordinates
        },
        items: order.items.map(i => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          isWaterJar: (i.name || '').toLowerCase().includes('jar') || (i.name || '').toLowerCase().includes('20l'),
          unitPricePaise: i.unitPricePaise
        })),
        totalJarsToDeliver: order.items
          .filter(i => (i.name || '').toLowerCase().includes('jar') || (i.name || '').toLowerCase().includes('20l'))
          .reduce((sum, i) => sum + i.quantity, 0),
        deliveryFeePaise: order.deliveryFeePaise > 0 ? order.deliveryFeePaise : 2000,
        deliveryStatus: 'SEARCHING_DELIVERY_PARTNER'
      });

      order.delivery = delivery._id;
    }

    // Update order deliveryStatus to SEARCHING
    order.deliveryStatus = 'SEARCHING_DELIVERY_PARTNER';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'SEARCHING_DELIVERY_PARTNER',
      timestamp: new Date(),
      changedBy: 'SYSTEM',
      notes: 'Initiated sequential rider search'
    });
    await order.save();

    // Initialize or retrieve queue tracking
    if (!activeDispatchQueues.has(orderId.toString())) {
      activeDispatchQueues.set(orderId.toString(), {
        currentRiderId: null,
        timer: null,
        attemptedRiders: new Set()
      });
    }

    await dispatchToNextCandidate(orderId.toString(), io);
  } catch (err) {
    console.error(`[DispatchService] Error starting dispatch for order ${orderId}:`, err);
  }
};

/**
 * Searches for the next available partner and dispatches the request with a 30s timeout
 */
const dispatchToNextCandidate = async (orderIdStr, io) => {
  const queue = activeDispatchQueues.get(orderIdStr);
  if (!queue) return;

  // Clear existing timer if any
  if (queue.timer) {
    clearTimeout(queue.timer);
    queue.timer = null;
  }

  const order = await Order.findById(orderIdStr).populate('user', 'displayName phone');
  if (!order || order.deliveryPartner || order.deliveryStatus !== 'SEARCHING_DELIVERY_PARTNER') {
    activeDispatchQueues.delete(orderIdStr);
    return;
  }

  // Auto-restore any delivery partners whose scheduled offline timer has expired
  const now = new Date();
  await User.updateMany(
    {
      role: 'delivery',
      availability: 'OFFLINE',
      'deliveryDetails.offlineUntil': { $ne: null, $lte: now }
    },
    {
      $set: {
        availability: 'ONLINE',
        'deliveryDetails.isOnline': true,
        'deliveryDetails.offlineUntil': null,
        'deliveryDetails.offlineOption': 'NORMAL_SHIFT',
        'deliveryDetails.lastStatusChangedAt': now
      }
    }
  );

  // Find candidate delivery partners strictly online
  const attemptedArray = Array.from(queue.attemptedRiders);
  const candidates = await User.find({
    role: 'delivery',
    isActive: true,
    onboardingComplete: true,
    availability: 'ONLINE',
    'deliveryDetails.isOnline': { $ne: false },
    currentActiveDelivery: null,
    _id: { $nin: attemptedArray }
  })
    .select('_id displayName phone deliveryDetails')
    .limit(10)
    .lean();

  if (!candidates || candidates.length === 0) {
    console.log(`[DispatchService] No more available riders for order ${orderIdStr}. Waiting for manual admin reassignment.`);
    // Alert admin room
    if (io) {
      io.to('admin_room').emit('order_unassigned_alert', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        message: 'No available delivery partner accepted this order. Manual reassignment required.'
      });
    }
    activeDispatchQueues.delete(orderIdStr);
    return;
  }

  // Select top candidate
  const selectedRider = candidates[0];
  queue.currentRiderId = selectedRider._id.toString();
  queue.attemptedRiders.add(selectedRider._id.toString());

  console.log(`[DispatchService] Offering Order #${order.orderNumber} to Rider: ${selectedRider.displayName} (${selectedRider._id}) with 30s timeout`);

  // Calculate approximate package metrics
  const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const estimatedWeightKg = order.items.reduce((sum, item) => {
    const isJar = (item.name || '').toLowerCase().includes('jar') || (item.name || '').toLowerCase().includes('20l');
    return sum + (isJar ? item.quantity * 20 : item.quantity * 0.75);
  }, 0);

  const earningsPaise = order.deliveryFeePaise > 0 ? order.deliveryFeePaise : 2000;
  const earningsRupees = (earningsPaise / 100).toFixed(2);

  const requestPayload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    orderType: 'NORMAL',
    pickupLocation: {
      name: 'Nilara Central Warehouse',
      address: 'Plot 42, Sector 62, Noida, UP',
      distanceKm: '1.2 km'
    },
    customerArea: order.deliveryAddressSnapshot?.city || order.deliveryAddressSnapshot?.addressLine1 || 'Customer Address',
    deliveryAddress: order.deliveryAddressSnapshot,
    deliveryDistanceKm: '3.8 km',
    numberOfItems: totalItems,
    approxWeightKg: Math.round(estimatedWeightKg * 10) / 10,
    deliveryEarnings: `₹${earningsRupees}`,
    items: order.items.map(i => ({ name: i.name, quantity: i.quantity })),
    expiresInSeconds: 30
  };

  // Emit TARGETED request specifically to this rider's private socket room
  if (io) {
    io.to(`user_${selectedRider._id}`).emit('targeted_delivery_request', requestPayload);
  }

  // Send high-priority FCM push notification so rider's phone wakes up and chimes even if screen off / app closed
  notifyRiderOrderOffered(selectedRider._id, order, 30).catch(err => {
    console.error('[DispatchService] Error pushing FCM alert to rider:', err.message);
  });

  // Set 30-second timeout lock
  queue.timer = setTimeout(async () => {
    console.log(`[DispatchService] Rider ${selectedRider.displayName} timed out (30s) on Order #${order.orderNumber}. Cascading to next candidate.`);
    
    // Notify rider app to dismiss
    if (io) {
      io.to(`user_${selectedRider._id}`).emit('delivery_request_expired', { orderId: order._id });
    }

    // Try next candidate
    await dispatchToNextCandidate(orderIdStr, io);
  }, REQUEST_TIMEOUT_MS);
};

/**
 * Handle rider accepting the normal order
 */
const acceptNormalOrder = async (orderId, driverId, io) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findOne({
      _id: orderId,
      deliveryStatus: { $in: ['SEARCHING_DELIVERY_PARTNER', 'NOT_ASSIGNED'] }
    }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'Order is no longer available or was accepted by another partner.' };
    }

    // Ensure driver is still online and not busy
    const driver = await User.findById(driverId).session(session);
    if (!driver || driver.availability === 'BUSY') {
      await session.abortTransaction();
      session.endSession();
      return { success: false, message: 'You already have an active delivery in progress.' };
    }

    const now = new Date();

    // 1. Update Order
    order.deliveryPartner = driverId;
    order.deliveryStatus = 'ASSIGNED';
    order.orderStatus = order.orderStatus === 'PLACED' ? 'CONFIRMED' : order.orderStatus;
    order.status = 'confirmed';
    order.acceptedAt = now;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'ASSIGNED',
      timestamp: now,
      changedBy: 'DRIVER',
      notes: `Accepted by driver ${driver.displayName}`
    });
    await order.save({ session });

    // 2. Update Delivery
    let delivery = await Delivery.findOne({ orderId: order._id }).session(session);
    if (delivery) {
      delivery.deliveryPartner = driverId;
      delivery.deliveryStatus = 'ASSIGNED';
      delivery.assignedAt = now;
      delivery.statusHistory = delivery.statusHistory || [];
      delivery.statusHistory.push({
        status: 'ASSIGNED',
        timestamp: now,
        changedBy: 'DRIVER',
        notes: `Assigned to driver ${driver.displayName}`
      });
      await delivery.save({ session });
    }

    // 3. Mark Driver as BUSY with this active delivery
    driver.availability = 'BUSY';
    driver.currentActiveDelivery = delivery ? delivery._id : null;
    await driver.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Clean up active dispatch timer
    const queue = activeDispatchQueues.get(orderId.toString());
    if (queue) {
      if (queue.timer) clearTimeout(queue.timer);
      activeDispatchQueues.delete(orderId.toString());
    }

    // Real-time socket events
    if (io) {
      io.to(`user_${driverId}`).emit('delivery_accepted_confirmed', { orderId: order._id, delivery });
      io.to(`user_${order.user}`).emit('delivery_assigned', {
        orderId: order._id,
        partnerId: driverId,
        driverName: driver.displayName,
        driverPhone: driver.phone
      });

      // Send push notification to customer
      notifyCustomerDriverAssigned(order, driver.displayName).catch(err => {
        console.error('[DispatchService] Error pushing driver assigned notification:', err.message);
      });
      io.to('admin_room').emit('order_status_updated', {
        orderId: order._id,
        orderStatus: order.orderStatus,
        deliveryStatus: 'ASSIGNED',
        partnerId: driverId
      });
    }

    return { success: true, data: { order, delivery } };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(`[DispatchService] Error in acceptNormalOrder:`, err);
    return { success: false, message: 'Failed to accept order due to server error.' };
  }
};

/**
 * Handle rider explicitly rejecting the order
 */
const rejectNormalOrder = async (orderId, driverId, io) => {
  const queue = activeDispatchQueues.get(orderId.toString());
  if (queue && queue.currentRiderId === driverId.toString()) {
    console.log(`[DispatchService] Rider ${driverId} explicitly rejected order ${orderId}. Cascading immediately.`);
    if (queue.timer) {
      clearTimeout(queue.timer);
      queue.timer = null;
    }
    // Cascade to next candidate
    await dispatchToNextCandidate(orderId.toString(), io);
  }
  return { success: true };
};

module.exports = {
  startNormalOrderDispatch,
  acceptNormalOrder,
  rejectNormalOrder
};
