const Order = require('../models/Order');
const Delivery = require('../models/Delivery');
const DeliveryRoute = require('../models/DeliveryRoute');
const Subscription = require('../models/Subscription');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const DutyLog = require('../models/DutyLog');
const { evaluateIncentivesForPartner } = require('./incentiveController');
const { acceptNormalOrder, rejectNormalOrder } = require('../services/dispatchService');
const { batchDeliveriesIntoRoutes } = require('../services/subscriptionBatchService');
const { notifyCustomerOrderStatus, notifyCustomerDriverAssigned } = require('../services/notificationService');

const getAvailableOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Delivery partners look for orders that are confirmed or preparing, and not yet assigned
    const filter = {
      status: { $in: ['confirmed', 'preparing', 'ready_for_pickup'] },
      deliveryPartner: { $exists: false }
    };
    
    const orders = await Order.find(filter)
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Order.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const acceptOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const partnerId = req.auth.userId;
    
    // Find an order that isn't already assigned
    const order = await Order.findOneAndUpdate(
      { _id: orderId, deliveryPartner: { $exists: false }, status: { $in: ['confirmed', 'preparing', 'ready_for_pickup'] } },
      { deliveryPartner: partnerId, status: 'out_for_delivery', outForDeliveryAt: new Date() },
      { new: true }
    );
    
    if (!order) {
      const err = new Error('Order is no longer available or already claimed by another partner');
      err.statusCode = 409;
      err.code = 'NOT_AVAILABLE';
      throw err;
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`order_${orderId}`).emit('delivery_assigned', { partnerId });
      io.to(`user_${order.user}`).emit('delivery_assigned', { partnerId, orderId });
      io.to('admin_room').emit('order_status_updated', { orderId: order._id, status: 'out_for_delivery', partnerId });
      // Notify all delivery partners that this order was claimed so popups dismiss
      io.to('delivery_room').emit('order_claimed', {
        orderId: order._id.toString(),
        claimedBy: partnerId
      });
    }

    // Send push notification to customer
    notifyCustomerOrderStatus(order, 'out_for_delivery').catch(err => {
      console.error('[DeliveryController] Error pushing order status notification:', err.message);
    });
    
    res.status(200).json({
      success: true,
      data: order,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const updateDeliveryStatus = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const partnerId = req.auth.userId;
    const { status } = req.body;
    
    // IDOR protection: partner can only update their assigned order
    const order = await Order.findOne({ _id: orderId, deliveryPartner: partnerId });
    
    if (!order) {
      const err = new Error('Order not found or not assigned to you');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    if (!['out_for_delivery', 'delivered'].includes(status)) {
      const err = new Error('Invalid delivery status update');
      err.statusCode = 400;
      err.code = 'INVALID_STATUS';
      throw err;
    }
    
    order.status = status;
    if (status === 'out_for_delivery') order.outForDeliveryAt = new Date();
    if (status === 'delivered') {
      order.deliveredAt = new Date();
      
      // Calculate earnings in Rupees (fallback to Rs 20 if 0)
      const feeRupees = order.deliveryFeePaise > 0 ? (order.deliveryFeePaise / 100) : 20;
      
      const user = await User.findById(partnerId);
      if (user) {
        user.walletBalance = (user.walletBalance || 0) + feeRupees;
        await user.save();
        
        await Transaction.create({
          user: partnerId,
          type: 'credit',
          amount: feeRupees,
          order: orderId,
          description: `Earning for Order #${order.orderNumber}`
        });
      }

      // Check and credit any completed incentives automatically
      await evaluateIncentivesForPartner(partnerId, req.app.get('io'));
    }
    
    await order.save();
    
    req.app.get('io').to(`user_${order.user}`).emit('order_status_updated', { orderId: order._id, status });
    req.app.get('io').to(`admin_room`).emit('order_status_updated', { orderId: order._id, status });

    // Send push notification to customer
    notifyCustomerOrderStatus(order, status).catch(err => {
      console.error('[DeliveryController] Error pushing order status notification:', err.message);
    });
    
    res.status(200).json({
      success: true,
      data: order,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};



const cloudinary = require('../config/cloudinary');
const fs = require('fs');

const completeOnboarding = async (req, res, next) => {
  try {
    const { 
      aadharNumber, 
      drivingLicenseNumber, 
      vehicleType, 
      vehicleNumber,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      accountType,
      upiId
    } = req.body;
    
    let aadharImageUrl = null;
    let profileImageUrl = null;
    let drivingLicenseImageUrl = null;
    let vehicleFrontImageUrl = null;
    let vehicleBackImageUrl = null;
    
    if (req.files && req.files['aadharImage']) {
      const result = await cloudinary.uploader.upload(req.files['aadharImage'][0].path, { folder: 'kyc' });
      aadharImageUrl = result.secure_url;
      fs.unlinkSync(req.files['aadharImage'][0].path);
    }
    
    if (req.files && req.files['profileImage']) {
      const result = await cloudinary.uploader.upload(req.files['profileImage'][0].path, { folder: 'kyc' });
      profileImageUrl = result.secure_url;
      fs.unlinkSync(req.files['profileImage'][0].path);
    }
    
    if (req.files && req.files['drivingLicenseImage']) {
      const result = await cloudinary.uploader.upload(req.files['drivingLicenseImage'][0].path, { folder: 'kyc' });
      drivingLicenseImageUrl = result.secure_url;
      fs.unlinkSync(req.files['drivingLicenseImage'][0].path);
    }
    
    if (req.files && req.files['vehicleFrontImage']) {
      const result = await cloudinary.uploader.upload(req.files['vehicleFrontImage'][0].path, { folder: 'kyc' });
      vehicleFrontImageUrl = result.secure_url;
      fs.unlinkSync(req.files['vehicleFrontImage'][0].path);
    }
    
    if (req.files && req.files['vehicleBackImage']) {
      const result = await cloudinary.uploader.upload(req.files['vehicleBackImage'][0].path, { folder: 'kyc' });
      vehicleBackImageUrl = result.secure_url;
      fs.unlinkSync(req.files['vehicleBackImage'][0].path);
    }

    let rcImageUrl = null;
    if (req.files && req.files['rcImage']) {
      const result = await cloudinary.uploader.upload(req.files['rcImage'][0].path, { folder: 'kyc' });
      rcImageUrl = result.secure_url;
      fs.unlinkSync(req.files['rcImage'][0].path);
    }

    const User = require('../models/User');
    const user = await User.findById(req.auth.userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (profileImageUrl) {
      user.photoUrl = profileImageUrl;
    }
    
    const existingBankDetails = user.deliveryDetails?.bankDetails || {};
    const bankDetails = (accountNumber || ifscCode || bankName || upiId) ? {
      accountHolderName: accountHolderName || user.displayName || '',
      bankName: bankName || '',
      accountNumber: accountNumber || '',
      ifscCode: ifscCode ? ifscCode.trim().toUpperCase() : '',
      accountType: accountType || 'Savings Account',
      upiId: upiId ? upiId.trim().toLowerCase() : '',
      payoutFrequency: 'Daily',
      payoutMode: 'Bank Transfer'
    } : existingBankDetails;

    user.deliveryDetails = {
      ...(user.deliveryDetails || {}),
      aadharNumber,
      aadharImage: aadharImageUrl,
      drivingLicenseNumber: drivingLicenseNumber ? drivingLicenseNumber.trim().toUpperCase() : drivingLicenseNumber,
      drivingLicenseImage: drivingLicenseImageUrl,
      vehicleType,
      vehicleNumber: vehicleNumber ? vehicleNumber.trim().toUpperCase() : vehicleNumber,
      vehicleFrontImage: vehicleFrontImageUrl,
      vehicleBackImage: vehicleBackImageUrl,
      rcImage: rcImageUrl || user.deliveryDetails?.rcImage,
      bankDetails
    };
    user.markModified('deliveryDetails');
    user.onboardingComplete = true;
    
    await user.save();
    
    res.status(200).json({ success: true, message: 'Onboarding completed successfully' });
  } catch (error) {
    next(error);
  }
};
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, email, dob, address, emergencyContact, vehicleType, vehicleNumber, drivingLicenseNumber, bankDetails, preferences } = req.body;
    const userId = req.auth?.userId || req.user?.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (displayName !== undefined) user.displayName = displayName;
    if (email !== undefined) user.email = email;
    if (dob !== undefined) user.dob = dob;
    if (address !== undefined) user.address = address;
    if (emergencyContact !== undefined) user.emergencyContact = emergencyContact;
    if (vehicleType !== undefined || vehicleNumber !== undefined || drivingLicenseNumber !== undefined) {
      if (!user.deliveryDetails) user.deliveryDetails = {};
      if (vehicleType !== undefined) user.deliveryDetails.vehicleType = vehicleType;
      if (vehicleNumber !== undefined) user.deliveryDetails.vehicleNumber = vehicleNumber.trim().toUpperCase();
      if (drivingLicenseNumber !== undefined) user.deliveryDetails.drivingLicenseNumber = drivingLicenseNumber.trim().toUpperCase();
      if (user.deliveryDetails.model) delete user.deliveryDetails.model;
      if (user.deliveryDetails.vehicleModel) delete user.deliveryDetails.vehicleModel;
      user.markModified('deliveryDetails');
    }
    if (bankDetails !== undefined) {
      if (!user.deliveryDetails) user.deliveryDetails = {};
      user.deliveryDetails.bankDetails = {
        ...(user.deliveryDetails.bankDetails || {}),
        ...bankDetails
      };
      user.markModified('deliveryDetails');
    }
    if (preferences !== undefined) {
      if (!user.deliveryDetails) user.deliveryDetails = {};
      user.deliveryDetails.preferences = {
        ...(user.deliveryDetails.preferences || {}),
        ...preferences
      };
      user.markModified('deliveryDetails');
    }
    
    await user.save();
    
    res.status(200).json({ success: true, message: 'Profile updated successfully', data: user });
  } catch (error) {
    next(error);
  }
};

const uploadRC = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No RC image file provided' });
    }

    const result = await cloudinary.uploader.upload(req.file.path, { folder: 'kyc' });
    const rcImageUrl = result.secure_url;
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    const userId = req.auth?.userId || req.user?.id;
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.deliveryDetails) user.deliveryDetails = {};
    user.deliveryDetails.rcImage = rcImageUrl;
    user.markModified('deliveryDetails');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'RC document uploaded successfully',
      data: { rcImage: rcImageUrl }
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

const getPreferences = async (req, res, next) => {
  try {
    const userId = req.auth?.userId || req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const defaultPrefs = {
      navigationApp: 'OpenStreetMap',
      autoCenterMap: true,
      voiceRoutePrompts: true,
      highContrastMap: false,
      offlineMapCaching: true,
      language: 'English',
      alertTone: 'Loud Ring',
      soundVolume: 85,
      vibrateOnAlert: true
    };

    const currentPrefs = user.deliveryDetails?.preferences;
    const preferences = {
      ...defaultPrefs,
      ...(currentPrefs && typeof currentPrefs.toObject === 'function' ? currentPrefs.toObject() : currentPrefs || {})
    };

    res.status(200).json({
      success: true,
      data: preferences
    });
  } catch (error) {
    next(error);
  }
};

const updatePreferences = async (req, res, next) => {
  try {
    const userId = req.auth?.userId || req.user?.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.deliveryDetails) user.deliveryDetails = {};
    const existingPrefs = user.deliveryDetails.preferences && typeof user.deliveryDetails.preferences.toObject === 'function'
      ? user.deliveryDetails.preferences.toObject()
      : (user.deliveryDetails.preferences || {});

    user.deliveryDetails.preferences = {
      ...existingPrefs,
      ...req.body
    };
    user.markModified('deliveryDetails');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.deliveryDetails.preferences
    });
  } catch (error) {
    next(error);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const filter = { deliveryPartner: partnerId };
    if (req.query.status) {
      if (req.query.status === 'delivered') {
        filter.status = 'delivered';
      } else if (req.query.status === 'cancelled') {
        filter.status = 'cancelled';
      } else if (req.query.status === 'active') {
        filter.status = { $in: ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'] };
      }
    }
    const orders = await Order.find(filter)
      .sort({ updatedAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

const getTodaysDeliveries = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch active subscriptions assigned to this partner
    const subscriptions = await Subscription.find({
      deliveryPartner: partnerId,
      status: { $in: ['Active', 'Pending'] }
    })
      .populate('user', 'displayName phone email')
      .lean();

    const todaySubscriptionDeliveries = [];

    subscriptions.forEach(sub => {
      const start = new Date(sub.startDate);
      start.setHours(0, 0, 0, 0);

      // Has not started yet
      if (start > today) return;

      // Has ended
      if (sub.endDate) {
        const end = new Date(sub.endDate);
        end.setHours(23, 59, 59, 999);
        if (today > end) return;
      }

      let isDue = false;
      const diffTime = Math.abs(today - start);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      switch (sub.frequency) {
        case 'Daily':
          isDue = true;
          break;
        case 'Alternate':
        case 'Alternate Days':
          isDue = diffDays % 2 === 0;
          break;
        case 'Weekly':
          isDue = start.getDay() === today.getDay();
          break;
        case 'Monthly':
          isDue = start.getDate() === today.getDate();
          break;
        default:
          isDue = true;
      }

      // Check skipped
      let isSkipped = false;
      if (sub.skippedDeliveries && sub.skippedDeliveries.length > 0) {
        isSkipped = sub.skippedDeliveries.some(skippedDate => {
          const sd = new Date(skippedDate);
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === today.getTime();
        });
      }

      if (isDue && !isSkipped) {
        // Check if completed today
        const isCompletedToday = sub.completedDeliveries && sub.completedDeliveries.some(compDate => {
          const cd = new Date(compDate);
          cd.setHours(0, 0, 0, 0);
          return cd.getTime() === today.getTime();
        });

        const address = sub.address || {};
        const fullAddress = address.apartment
          ? `${address.apartment}, ${address.street || ''} ${address.city || ''}`
          : (address.street || address.formattedAddress || 'Customer Address');

        todaySubscriptionDeliveries.push({
          id: `sub_${sub._id}`,
          subscriptionId: sub._id,
          type: 'subscription',
          customerName: sub.user?.displayName || 'Subscriber',
          customerPhone: sub.user?.phone || '',
          address: fullAddress,
          rawAddress: address,
          items: `${sub.quantity}x ${sub.productName}`,
          quantity: sub.quantity,
          productName: sub.productName,
          planName: sub.planName,
          frequency: sub.frequency,
          timeWindow: sub.deliveryTime || 'Standard (6 AM - 9 AM)',
          instructions: sub.specialInstructions || '',
          leaveAtDoor: sub.leaveAtDoor || false,
          callBeforeDelivery: sub.callBeforeDelivery || false,
          paymentMethod: sub.paymentMethod || 'Prepaid',
          price: sub.price,
          status: isCompletedToday ? 'delivered' : 'pending',
          isDeliveredToday: !!isCompletedToday,
          earning: 20 // Rs 20 earning per drop
        });
      }
    });

    // 2. Fetch one-time assigned regular orders for today
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = await Order.find({
      deliveryPartner: partnerId,
      $or: [
        { status: { $in: ['confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'] } },
        { status: 'delivered', deliveredAt: { $gte: today, $lt: tomorrow } }
      ]
    })
      .populate('user', 'displayName phone')
      .lean();

    const todayOrderDeliveries = orders.map(order => {
      const addr = order.deliveryAddressSnapshot || {};
      const fullAddr = `${addr.addressLine1 || ''} ${addr.addressLine2 || ''}, ${addr.city || ''}`.trim();
      const feeRupees = order.deliveryFeePaise > 0 ? (order.deliveryFeePaise / 100) : 20;

      return {
        id: `ord_${order._id}`,
        orderId: order._id,
        orderNumber: order.orderNumber,
        type: 'order',
        customerName: order.user?.displayName || addr.recipientName || 'Customer',
        customerPhone: order.user?.phone || addr.phone || '',
        address: fullAddr,
        rawAddress: addr,
        items: `${order.items?.length || 0} items (${order.items?.map(i => i.name).join(', ')})`,
        timeWindow: order.deliveryTimePref || 'Instant Delivery',
        instructions: order.customerNotes || '',
        status: order.status,
        isDeliveredToday: order.status === 'delivered',
        earning: feeRupees,
        totalPaise: order.totalPaise,
        paymentMethod: order.paymentMethod
      };
    });

    const totalCount = todaySubscriptionDeliveries.length + todayOrderDeliveries.length;
    const completedCount = todaySubscriptionDeliveries.filter(d => d.isDeliveredToday).length +
      todayOrderDeliveries.filter(d => d.isDeliveredToday).length;

    res.status(200).json({
      success: true,
      data: {
        subscriptions: todaySubscriptionDeliveries,
        orders: todayOrderDeliveries,
        all: [...todaySubscriptionDeliveries, ...todayOrderDeliveries],
        summary: {
          total: totalCount,
          completed: completedCount,
          pending: totalCount - completedCount
        }
      },
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const markSubscriptionDelivered = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;

    const sub = await Subscription.findOne({ _id: id, deliveryPartner: partnerId });
    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found or not assigned to you' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyMarked = sub.completedDeliveries && sub.completedDeliveries.some(d => {
      const sd = new Date(d);
      sd.setHours(0, 0, 0, 0);
      return sd.getTime() === today.getTime();
    });

    if (alreadyMarked) {
      return res.status(400).json({ success: false, message: 'Delivery already marked as completed for today' });
    }

    sub.completedDeliveries = sub.completedDeliveries || [];
    sub.completedDeliveries.push(today);
    await sub.save();

    // Credit driver wallet with delivery fee
    const feeRupees = 20; // Rs 20 per daily subscription drop
    const user = await User.findById(partnerId);
    if (user) {
      user.walletBalance = (user.walletBalance || 0) + feeRupees;
      await user.save();

      await Transaction.create({
        user: partnerId,
        type: 'credit',
        amount: feeRupees,
        description: `Daily Delivery for Subscription #${sub.planName} (${sub.productName})`
      });
    }

    // Evaluate incentives
    await evaluateIncentivesForPartner(partnerId, req.app.get('io'));

    // Emit socket events
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('subscription_delivery_completed', {
        subscriptionId: sub._id,
        partnerId,
        date: today
      });
      io.to(`user_${sub.user}`).emit('daily_delivery_completed', {
        subscriptionId: sub._id,
        date: today,
        productName: sub.productName
      });
      io.to(`user_${partnerId}`).emit('wallet_updated', {
        walletBalance: user ? user.walletBalance : undefined
      });
    }

    res.status(200).json({
      success: true,
      message: 'Daily delivery marked as completed successfully',
      data: {
        subscriptionId: sub._id,
        completedAt: today,
        earnedRupees: feeRupees
      }
    });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// NORMAL ORDER STEP-BY-STEP PROGRESSION
// ==========================================

const respondToOrderRequest = async (req, res, next) => {
  try {
    const { orderId, action } = req.body;
    const partnerId = req.auth.userId;

    if (!orderId || !action) {
      return res.status(400).json({ success: false, message: 'orderId and action (ACCEPT or REJECT) are required' });
    }

    if (action.toUpperCase() === 'ACCEPT') {
      const result = await acceptNormalOrder(orderId, partnerId, req.app.get('io'));
      if (!result.success) {
        return res.status(409).json(result);
      }
      return res.status(200).json(result);
    } else {
      const result = await rejectNormalOrder(orderId, partnerId, req.app.get('io'));
      return res.status(200).json(result);
    }
  } catch (err) {
    next(err);
  }
};

const arrivedAtPickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    order.deliveryStatus = 'ARRIVED_AT_PICKUP';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'ARRIVED_AT_PICKUP',
      timestamp: new Date(),
      changedBy: 'DRIVER',
      notes: 'Driver arrived at pickup warehouse'
    });
    await order.save();

    await Delivery.updateOne(
      { orderId: order._id },
      { deliveryStatus: 'ARRIVED_AT_PICKUP', arrivedAtPickupAt: new Date() }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit('delivery_step_updated', { orderId: order._id, step: 'ARRIVED_AT_PICKUP' });
      io.to('admin_room').emit('delivery_step_updated', { orderId: order._id, step: 'ARRIVED_AT_PICKUP' });
    }

    res.status(200).json({ success: true, message: 'Status updated: Arrived at pickup', data: order });
  } catch (err) {
    next(err);
  }
};

const confirmPickup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    const now = new Date();
    order.deliveryStatus = 'OUT_FOR_DELIVERY';
    order.orderStatus = 'PROCESSING';
    order.status = 'out_for_delivery';
    order.outForDeliveryAt = now;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'OUT_FOR_DELIVERY',
      timestamp: now,
      changedBy: 'DRIVER',
      notes: 'Order picked up from warehouse and out for delivery'
    });
    await order.save();

    await Delivery.updateOne(
      { orderId: order._id },
      { deliveryStatus: 'OUT_FOR_DELIVERY', pickedUpAt: now }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit('order_status_updated', { orderId: order._id, status: 'out_for_delivery', deliveryStatus: 'OUT_FOR_DELIVERY' });
      io.to('admin_room').emit('order_status_updated', { orderId: order._id, status: 'out_for_delivery', deliveryStatus: 'OUT_FOR_DELIVERY' });
    }

    notifyCustomerOrderStatus(order, 'out_for_delivery').catch(err => {
      console.error('[DeliveryController] Error pushing out_for_delivery notification:', err.message);
    });

    res.status(200).json({ success: true, message: 'Order picked up and out for delivery', data: order });
  } catch (err) {
    next(err);
  }
};

const arrivedAtCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    order.deliveryStatus = 'ARRIVED_AT_CUSTOMER';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'ARRIVED_AT_CUSTOMER',
      timestamp: new Date(),
      changedBy: 'DRIVER',
      notes: 'Driver arrived at customer location'
    });
    await order.save();

    await Delivery.updateOne(
      { orderId: order._id },
      { deliveryStatus: 'ARRIVED_AT_CUSTOMER', arrivedAtCustomerAt: new Date() }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit('delivery_step_updated', { orderId: order._id, step: 'ARRIVED_AT_CUSTOMER' });
      io.to('admin_room').emit('delivery_step_updated', { orderId: order._id, step: 'ARRIVED_AT_CUSTOMER' });
    }

    res.status(200).json({ success: true, message: 'Driver arrived at customer location', data: order });
  } catch (err) {
    next(err);
  }
};

const completeDeliveryStep = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;
    const { jarsDelivered = 0, emptyJarsCollected = 0 } = req.body;

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    const now = new Date();
    order.deliveryStatus = 'DELIVERED';
    order.orderStatus = 'COMPLETED';
    order.status = 'delivered';
    order.deliveredAt = now;
    order.jarsDelivered = Number(jarsDelivered);
    order.emptyJarsCollected = Number(emptyJarsCollected);
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'DELIVERED',
      timestamp: now,
      changedBy: 'DRIVER',
      notes: `Delivered: ${jarsDelivered} jars, Collected: ${emptyJarsCollected} empty jars`
    });
    await order.save();

    await Delivery.updateOne(
      { orderId: order._id },
      {
        deliveryStatus: 'DELIVERED',
        deliveredAt: now,
        jarsDelivered: Number(jarsDelivered),
        emptyJarsCollected: Number(emptyJarsCollected)
      }
    );

    // Update Customer Returnable Jar Balance
    if (order.user) {
      const customer = await User.findById(order.user);
      if (customer) {
        if (!customer.jarBalance) customer.jarBalance = { heldJars: 0, returnedJars: 0 };
        customer.jarBalance.heldJars = Math.max(0, (customer.jarBalance.heldJars || 0) + Number(jarsDelivered) - Number(emptyJarsCollected));
        customer.jarBalance.returnedJars = (customer.jarBalance.returnedJars || 0) + Number(emptyJarsCollected);
        await customer.save();
      }
    }

    // Credit driver earnings
    const feeRupees = order.deliveryFeePaise > 0 ? (order.deliveryFeePaise / 100) : 20;
    const driver = await User.findById(partnerId);
    if (driver) {
      driver.walletBalance = (driver.walletBalance || 0) + feeRupees;
      driver.availability = 'ONLINE'; // Free up driver
      driver.currentActiveDelivery = null;
      await driver.save();

      await Transaction.create({
        user: partnerId,
        type: 'credit',
        amount: feeRupees,
        order: order._id,
        description: `Earning for Delivery #${order.orderNumber}`
      });
    }

    await evaluateIncentivesForPartner(partnerId, req.app.get('io'));

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit('order_status_updated', {
        orderId: order._id,
        status: 'delivered',
        deliveryStatus: 'DELIVERED',
        jarsDelivered,
        emptyJarsCollected
      });
      io.to('admin_room').emit('order_status_updated', {
        orderId: order._id,
        status: 'delivered',
        deliveryStatus: 'DELIVERED'
      });
      io.to(`user_${partnerId}`).emit('wallet_updated', {
        walletBalance: driver ? driver.walletBalance : undefined
      });
    }

    notifyCustomerOrderStatus(order, 'delivered').catch(err => {
      console.error('[DeliveryController] Error pushing delivered notification:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Delivery successfully completed',
      data: {
        orderId: order._id,
        earnedRupees: feeRupees,
        jarsDelivered,
        emptyJarsCollected
      }
    });
  } catch (err) {
    next(err);
  }
};

const markCustomerUnavailable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;
    const { reason = 'Customer not reachable' } = req.body;

    const order = await Order.findOne({ _id: id, deliveryPartner: partnerId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    order.deliveryStatus = 'CUSTOMER_UNAVAILABLE';
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: 'CUSTOMER_UNAVAILABLE',
      timestamp: new Date(),
      changedBy: 'DRIVER',
      notes: reason
    });
    await order.save();

    await Delivery.updateOne(
      { orderId: order._id },
      { deliveryStatus: 'CUSTOMER_UNAVAILABLE', failedAt: new Date(), failureReason: reason }
    );

    // Free up driver
    const driver = await User.findById(partnerId);
    if (driver) {
      driver.availability = 'ONLINE';
      driver.currentActiveDelivery = null;
      await driver.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user}`).emit('delivery_step_updated', { orderId: order._id, step: 'CUSTOMER_UNAVAILABLE', reason });
      io.to('admin_room').emit('delivery_step_updated', { orderId: order._id, step: 'CUSTOMER_UNAVAILABLE', reason });
    }

    res.status(200).json({ success: true, message: 'Delivery marked as customer unavailable', data: order });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// SUBSCRIPTION ROUTE PROGRESSION
// ==========================================

const getMyRoutes = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Ensure today's schedule is generated and batched
    await batchDeliveriesIntoRoutes(today, req.app.get('io'));

    const routes = await DeliveryRoute.find({
      deliveryPartner: partnerId,
      date: { $gte: today, $lt: tomorrow }
    })
      .populate({
        path: 'deliveries',
        populate: { path: 'customer', select: 'displayName phone email' }
      })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: routes
    });
  } catch (err) {
    next(err);
  }
};

const startRoute = async (req, res, next) => {
  try {
    const { id } = req.params;
    const partnerId = req.auth.userId;

    const route = await DeliveryRoute.findOne({ _id: id, deliveryPartner: partnerId });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found or not assigned to you' });
    }

    route.status = 'STARTED';
    route.startedAt = new Date();
    route.statusHistory = route.statusHistory || [];
    route.statusHistory.push({
      status: 'STARTED',
      timestamp: new Date(),
      changedBy: 'DRIVER',
      notes: 'Driver started subscription delivery route'
    });
    await route.save();

    // Mark driver BUSY
    await User.updateOne({ _id: partnerId }, { availability: 'BUSY', currentActiveRoute: route._id });

    // Mark first stop OUT_FOR_DELIVERY
    if (route.deliveries && route.deliveries.length > 0) {
      await Delivery.updateOne(
        { _id: route.deliveries[0] },
        { deliveryStatus: 'OUT_FOR_DELIVERY' }
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('route_status_updated', { routeId: route._id, status: 'STARTED' });
    }

    res.status(200).json({ success: true, message: 'Route started successfully', data: route });
  } catch (err) {
    next(err);
  }
};

const updateRouteStopStatus = async (req, res, next) => {
  try {
    const { id, stopId } = req.params;
    const partnerId = req.auth.userId;
    const { status, jarsDelivered = 0, emptyJarsCollected = 0, failureReason } = req.body;

    const route = await DeliveryRoute.findOne({ _id: id, deliveryPartner: partnerId });
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found or not assigned to you' });
    }

    const delivery = await Delivery.findOne({ _id: stopId, routeId: route._id });
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Stop not found in this route' });
    }

    const now = new Date();
    delivery.deliveryStatus = status;

    if (status === 'DELIVERED') {
      delivery.deliveredAt = now;
      delivery.jarsDelivered = Number(jarsDelivered);
      delivery.emptyJarsCollected = Number(emptyJarsCollected);

      route.completedStops += 1;
      route.totalJarsDelivered += Number(jarsDelivered);
      route.totalEmptyJarsCollected += Number(emptyJarsCollected);

      // Customer jar balance update
      if (delivery.customer) {
        const customer = await User.findById(delivery.customer);
        if (customer) {
          if (!customer.jarBalance) customer.jarBalance = { heldJars: 0, returnedJars: 0 };
          customer.jarBalance.heldJars = Math.max(0, (customer.jarBalance.heldJars || 0) + Number(jarsDelivered) - Number(emptyJarsCollected));
          customer.jarBalance.returnedJars = (customer.jarBalance.returnedJars || 0) + Number(emptyJarsCollected);
          await customer.save();
        }
      }

      // Credit ₹20 stop earning
      const driver = await User.findById(partnerId);
      if (driver) {
        driver.walletBalance = (driver.walletBalance || 0) + 20;
        await driver.save();
        await Transaction.create({
          user: partnerId,
          type: 'credit',
          amount: 20,
          description: `Route #${route.routeNumber} Stop Delivery`
        });
      }
    } else if (['CUSTOMER_UNAVAILABLE', 'DELIVERY_FAILED'].includes(status)) {
      delivery.failedAt = now;
      delivery.failureReason = failureReason || 'Customer unavailable';
      route.failedStops += 1;
    }

    delivery.statusHistory = delivery.statusHistory || [];
    delivery.statusHistory.push({
      status,
      timestamp: now,
      changedBy: 'DRIVER',
      notes: `Stop status updated: ${status}`
    });
    await delivery.save();

    // Check if entire route is completed
    if (route.completedStops + route.failedStops >= route.totalStops) {
      route.status = 'COMPLETED';
      route.completedAt = now;
      await User.updateOne({ _id: partnerId }, { availability: 'ONLINE', currentActiveRoute: null });
    } else {
      // Find next stop and mark OUT_FOR_DELIVERY
      const nextDelivery = await Delivery.findOne({
        routeId: route._id,
        deliveryStatus: 'ASSIGNED'
      }).sort({ stopIndex: 1 });

      if (nextDelivery) {
        nextDelivery.deliveryStatus = 'OUT_FOR_DELIVERY';
        await nextDelivery.save();
      }
    }

    await route.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('route_progress_updated', {
        routeId: route._id,
        completedStops: route.completedStops,
        totalStops: route.totalStops,
        status: route.status
      });
      io.to(`user_${delivery.customer}`).emit('daily_delivery_completed', {
        deliveryId: delivery._id,
        status
      });
    }

    res.status(200).json({
      success: true,
      message: 'Stop status updated successfully',
      data: {
        route,
        delivery
      }
    });
  } catch (err) {
    next(err);
  }
};

const updateDutyStatus = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const { isOnline, durationMinutes, option, notes } = req.body;

    const user = await User.findById(partnerId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const now = new Date();
    user.deliveryDetails = user.deliveryDetails || {};

    let offlineUntilDate = null;
    if (!isOnline && durationMinutes && Number(durationMinutes) > 0) {
      offlineUntilDate = new Date(now.getTime() + Number(durationMinutes) * 60000);
    }

    // 1. Close current open duty log if exists
    if (user.deliveryDetails.currentDutyLogId) {
      const activeLog = await DutyLog.findById(user.deliveryDetails.currentDutyLogId);
      if (activeLog && !activeLog.endedAt) {
        activeLog.endedAt = now;
        const diffMs = now.getTime() - new Date(activeLog.startedAt).getTime();
        activeLog.durationMinutes = Math.max(1, Math.round(diffMs / 60000));
        await activeLog.save();
      }
    }

    // 2. Create new DutyLog entry
    const newStatus = isOnline ? 'ONLINE' : 'OFFLINE';
    let durationOpt = option;
    if (!durationOpt) {
      if (isOnline) {
        durationOpt = 'NORMAL_SHIFT';
      } else if (durationMinutes) {
        durationOpt = `${durationMinutes}_MINUTES`;
      } else {
        durationOpt = 'UNTIL_CHANGED';
      }
    }

    const newLog = await DutyLog.create({
      deliveryPartner: user._id,
      status: newStatus,
      startedAt: now,
      offlineUntil: offlineUntilDate,
      durationOption: durationOpt,
      notes: notes || ''
    });

    // 3. Update User document
    user.availability = isOnline ? 'ONLINE' : 'OFFLINE';
    user.deliveryDetails.isOnline = Boolean(isOnline);
    user.deliveryDetails.offlineUntil = offlineUntilDate;
    user.deliveryDetails.offlineOption = durationOpt;
    user.deliveryDetails.currentDutyLogId = newLog._id;
    user.deliveryDetails.lastStatusChangedAt = now;

    await user.save();

    // 4. Emit real-time status change to admin_room and user's socket room
    const io = req.app.get('io');
    if (io) {
      const payload = {
        partnerId: user._id.toString(),
        name: user.displayName || 'Delivery Partner',
        phone: user.phone,
        isOnline: Boolean(isOnline),
        availability: user.availability,
        offlineUntil: offlineUntilDate,
        offlineOption: durationOpt,
        lastStatusChangedAt: now
      };
      io.to('admin_room').emit('rider_status_changed', payload);
      io.to(`user_${user._id}`).emit('duty_status_updated', payload);
    }

    res.status(200).json({
      success: true,
      message: `Duty status updated to ${newStatus}`,
      data: {
        isOnline: Boolean(isOnline),
        availability: user.availability,
        offlineUntil: offlineUntilDate,
        offlineOption: durationOpt,
        lastStatusChangedAt: now,
        currentDutyLogId: newLog._id
      }
    });
  } catch (err) {
    next(err);
  }
};

const getDutyStatus = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const user = await User.findById(partnerId).select('availability deliveryDetails displayName phone');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Delivery partner not found' });
    }

    const details = user.deliveryDetails || {};
    let isOnline = details.isOnline !== undefined ? details.isOnline : (user.availability === 'ONLINE');
    const offlineUntil = details.offlineUntil;
    const now = new Date();

    // Check if scheduled offline time has expired
    if (!isOnline && offlineUntil && new Date(offlineUntil) <= now) {
      // Auto-expire offline break and restore ONLINE
      isOnline = true;
      user.availability = 'ONLINE';
      details.isOnline = true;
      details.offlineUntil = null;
      details.offlineOption = 'NORMAL_SHIFT';
      details.lastStatusChangedAt = now;

      // Close offline log & open online log
      if (details.currentDutyLogId) {
        const activeLog = await DutyLog.findById(details.currentDutyLogId);
        if (activeLog && !activeLog.endedAt) {
          activeLog.endedAt = now;
          const diffMs = now.getTime() - new Date(activeLog.startedAt).getTime();
          activeLog.durationMinutes = Math.max(1, Math.round(diffMs / 60000));
          await activeLog.save();
        }
      }

      const newLog = await DutyLog.create({
        deliveryPartner: user._id,
        status: 'ONLINE',
        startedAt: now,
        durationOption: 'NORMAL_SHIFT',
        notes: 'Auto-resumed after scheduled offline duration expired'
      });
      details.currentDutyLogId = newLog._id;
      await user.save();

      const io = req.app.get('io');
      if (io) {
        io.to('admin_room').emit('rider_status_changed', {
          partnerId: user._id.toString(),
          name: user.displayName || 'Delivery Partner',
          isOnline: true,
          availability: 'ONLINE',
          offlineUntil: null,
          offlineOption: 'NORMAL_SHIFT',
          lastStatusChangedAt: now
        });
      }
    }

    let remainingMinutes = 0;
    if (!isOnline && offlineUntil && new Date(offlineUntil) > now) {
      remainingMinutes = Math.ceil((new Date(offlineUntil).getTime() - now.getTime()) / 60000);
    }

    res.status(200).json({
      success: true,
      data: {
        isOnline,
        availability: user.availability,
        offlineUntil: details.offlineUntil,
        offlineOption: details.offlineOption,
        remainingMinutes,
        lastStatusChangedAt: details.lastStatusChangedAt
      }
    });
  } catch (err) {
    next(err);
  }
};

const getMyDutyLogs = async (req, res, next) => {
  try {
    const partnerId = req.auth.userId;
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const logs = await DutyLog.find({ deliveryPartner: partnerId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
  updateRouteStopStatus,
  updateDutyStatus,
  getDutyStatus,
  getMyDutyLogs
};

