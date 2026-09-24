/**
 * Subscription Batch Service
 * Automatically generates daily Delivery instances for active subscriptions
 * and groups them into area & time-slot Delivery Routes for multi-stop fulfillment.
 */

const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const DeliveryRoute = require('../models/DeliveryRoute');
const crypto = require('crypto');

/**
 * Checks if a subscription is due for delivery on a given date
 */
const isSubscriptionDueOnDate = (sub, date) => {
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  const start = new Date(sub.startDate);
  start.setHours(0, 0, 0, 0);

  if (target < start) return false;
  if (sub.endDate && target > new Date(sub.endDate)) return false;

  const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24));

  switch (sub.frequency) {
    case 'Daily':
      return true;
    case 'Alternate':
    case 'Alternate Days':
      return diffDays % 2 === 0;
    case 'Weekly':
      return diffDays % 7 === 0;
    case 'Monthly':
      return start.getDate() === target.getDate();
    default:
      return true;
  }
};

/**
 * Generates today's Delivery instances for all active subscriptions
 * @param {Date} targetDate 
 * @returns {Promise<Array>} Generated delivery documents
 */
const generateDailySubscriptionDeliveries = async (targetDate = new Date()) => {
  const dateObj = new Date(targetDate);
  dateObj.setHours(0, 0, 0, 0);

  const nextDay = new Date(dateObj);
  nextDay.setDate(nextDay.getDate() + 1);

  const activeSubscriptions = await Subscription.find({
    status: { $in: ['Active', 'Pending'] }
  }).populate('user', 'displayName phone email');

  const generatedDeliveries = [];

  for (const sub of activeSubscriptions) {
    // 1. Frequency check
    if (!isSubscriptionDueOnDate(sub, dateObj)) continue;

    // 2. Skipped check
    const isSkipped = sub.skippedDeliveries && sub.skippedDeliveries.some(skippedDate => {
      const sd = new Date(skippedDate);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === dateObj.getTime();
    });
    if (isSkipped) continue;

    // 3. Idempotency check: has this delivery already been generated?
    const existing = await Delivery.findOne({
      subscriptionId: sub._id,
      scheduledDate: { $gte: dateObj, $lt: nextDay }
    });
    if (existing) {
      generatedDeliveries.push(existing);
      continue;
    }

    // 4. Create new Delivery entity
    const deliveryNumber = `DEL-SUB-${dateObj.toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const address = sub.address || {};
    const area = address.area || address.city || address.landmark || 'Sector 62';

    const delivery = await Delivery.create({
      deliveryNumber,
      orderType: 'SUBSCRIPTION',
      subscriptionId: sub._id,
      customer: sub.user?._id || sub.user,
      deliveryPartner: sub.deliveryPartner || null,
      scheduledDate: dateObj,
      timeSlot: {
        label: sub.deliveryTime || 'Morning (6:00 AM - 9:00 AM)',
        start: '06:00',
        end: '09:00'
      },
      deliveryAddress: {
        recipientName: address.name || sub.user?.displayName || 'Subscriber',
        phone: address.phone || sub.user?.phone || '',
        addressLine1: address.apartment || address.addressLine1 || address.street || '',
        addressLine2: address.street || address.addressLine2 || '',
        city: address.city || 'Noida',
        state: address.state || 'UP',
        postalCode: address.postalCode || '',
        area: area,
        coordinates: address.coordinates || [77.3639, 28.6200]
      },
      items: [{
        name: sub.productName || '20L Nilara Pure Water Can',
        quantity: sub.quantity || 1,
        isWaterJar: true,
        unitPricePaise: (sub.price || 80) * 100
      }],
      totalJarsToDeliver: sub.quantity || 1,
      jarsDelivered: 0,
      emptyJarsCollected: 0,
      specialInstructions: sub.specialInstructions || '',
      leaveAtDoor: sub.leaveAtDoor || false,
      callBeforeDelivery: sub.callBeforeDelivery || false,
      deliveryFeePaise: 2000,
      deliveryStatus: sub.deliveryPartner ? 'ASSIGNED' : 'NOT_ASSIGNED',
      statusHistory: [{
        status: sub.deliveryPartner ? 'ASSIGNED' : 'NOT_ASSIGNED',
        timestamp: new Date(),
        changedBy: 'SYSTEM',
        notes: 'Daily subscription delivery scheduled'
      }]
    });

    generatedDeliveries.push(delivery);
  }

  return generatedDeliveries;
};

/**
 * Groups today's unassigned/new subscription deliveries into Routes by Area & TimeSlot
 */
const batchDeliveriesIntoRoutes = async (targetDate = new Date(), io = null) => {
  const dateObj = new Date(targetDate);
  dateObj.setHours(0, 0, 0, 0);

  const nextDay = new Date(dateObj);
  nextDay.setDate(nextDay.getDate() + 1);

  // 1. Generate deliveries first if needed
  await generateDailySubscriptionDeliveries(dateObj);

  // 2. Find deliveries that have no route yet
  const unroutedDeliveries = await Delivery.find({
    orderType: 'SUBSCRIPTION',
    scheduledDate: { $gte: dateObj, $lt: nextDay },
    routeId: null
  });

  if (unroutedDeliveries.length === 0) {
    return [];
  }

  // 3. Group by Area + TimeSlot + (Assigned Partner if any)
  const groups = new Map();

  for (const del of unroutedDeliveries) {
    const area = del.deliveryAddress?.area || 'Sector 62';
    const timeLabel = del.timeSlot?.label || 'Morning';
    const partnerId = del.deliveryPartner ? del.deliveryPartner.toString() : 'unassigned';
    const key = `${area}__${timeLabel}__${partnerId}`;

    if (!groups.has(key)) {
      groups.set(key, {
        area,
        timeSlot: del.timeSlot,
        partnerId: del.deliveryPartner || null,
        deliveries: []
      });
    }
    groups.get(key).deliveries.push(del);
  }

  const createdRoutes = [];

  // 4. Create DeliveryRoute for each group
  let routeSeq = 101;
  for (const [key, group] of groups.entries()) {
    const routeNumber = `RTE-${dateObj.toISOString().slice(0, 10).replace(/-/g, '')}-${routeSeq++}`;
    const totalStops = group.deliveries.length;
    const totalJars = group.deliveries.reduce((sum, d) => sum + (d.totalJarsToDeliver || 1), 0);

    const route = await DeliveryRoute.create({
      routeNumber,
      deliveryPartner: group.partnerId,
      date: dateObj,
      area: group.area,
      timeSlot: {
        start: group.timeSlot?.start || '06:00',
        end: group.timeSlot?.end || '09:00',
        label: group.timeSlot?.label || 'Morning (6:00 AM - 9:00 AM)'
      },
      deliveries: group.deliveries.map(d => d._id),
      totalStops,
      completedStops: 0,
      totalJarsToDeliver: totalJars,
      totalJarsDelivered: 0,
      totalEmptyJarsCollected: 0,
      status: group.partnerId ? 'ASSIGNED' : 'CREATED',
      statusHistory: [{
        status: group.partnerId ? 'ASSIGNED' : 'CREATED',
        timestamp: new Date(),
        changedBy: 'SYSTEM',
        notes: `Route created with ${totalStops} stops in ${group.area}`
      }]
    });

    // Update each delivery with routeId and stop index
    for (let i = 0; i < group.deliveries.length; i++) {
      const del = group.deliveries[i];
      del.routeId = route._id;
      del.stopIndex = i + 1;
      await del.save();
    }

    createdRoutes.push(route);

    // Notify driver if assigned
    if (group.partnerId && io) {
      io.to(`user_${group.partnerId}`).emit('subscription_route_assigned', {
        routeId: route._id,
        routeNumber: route.routeNumber,
        area: route.area,
        totalStops: route.totalStops,
        totalJars: route.totalJarsToDeliver
      });
    }
  }

  return createdRoutes;
};

module.exports = {
  isSubscriptionDueOnDate,
  generateDailySubscriptionDeliveries,
  batchDeliveriesIntoRoutes
};
