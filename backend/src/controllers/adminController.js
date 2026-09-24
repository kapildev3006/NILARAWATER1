const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth } = require('../config/firebase');
const Product = require('../models/Product');
const BulkOrder = require('../models/BulkOrder');
const Subscription = require('../models/Subscription');
const Delivery = require('../models/Delivery');
const DeliveryRoute = require('../models/DeliveryRoute');
const { batchDeliveriesIntoRoutes } = require('../services/subscriptionBatchService');
const { recordAudit } = require('../models/AuditLog');
const { messaging } = require('../config/firebase');
const { notifyCustomerOrderStatus } = require('../services/notificationService');

const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Optionally filter by status
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'displayName email phone')
      .populate('deliveryPartner', 'displayName phone')
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

const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    const oldStatus = order.status;
    order.status = status;
    
    if (status === 'cancelled') {
      order.cancelledAt = new Date();
      // NOTE: We do not auto-refund stock here. Admins must handle stock manually or we add a complex rollback logic.
    }
    if (status === 'delivered' && oldStatus !== 'delivered') {
      order.deliveredAt = new Date();
      if (order.deliveryPartner) {
        const feeRupees = order.deliveryFeePaise > 0 ? (order.deliveryFeePaise / 100) : 20;
        const partner = await User.findById(order.deliveryPartner);
        if (partner) {
          partner.walletBalance = (partner.walletBalance || 0) + feeRupees;
          await partner.save();
          await Transaction.create({
            user: order.deliveryPartner,
            type: 'credit',
            amount: feeRupees,
            order: order._id,
            description: `Earning for Order #${order.orderNumber}`
          });
        }
        const { evaluateIncentivesForPartner } = require('./incentiveController');
        await evaluateIncentivesForPartner(order.deliveryPartner, req.app.get('io'));
      }
    }
    
    await order.save();
    
    await recordAudit('ADMIN_ORDER_UPDATE', req.auth.userId, {
      orderId: order._id,
      oldStatus,
      newStatus: status
    });
    
    // Trigger Socket.IO event
    req.app.get('io').to(`user_${order.user}`).emit('order_status_updated', { orderId: order._id, status });
    req.app.get('io').to(`admin_room`).emit('order_status_updated', { orderId: order._id, status });
    req.app.get('io').to(`delivery_room`).emit('order_status_updated', { orderId: order._id, status });
    
    // Send FCM Push Notification
    notifyCustomerOrderStatus(order, status).catch(fcmErr => {
      console.error('Failed to send FCM notification:', fcmErr);
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


const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await User.find({ role: 'customer' })
      .select('displayName email phone isActive photoUrl createdAt')
      .sort({ createdAt: -1 });

    const formattedCustomers = customers.map(c => ({
      id: c._id.toString(),
      name: c.displayName || 'Unknown User',
      email: c.email || 'N/A',
      phone: c.phone || 'N/A',
      avatar: c.photoUrl,
      status: c.isActive ? 'Active' : 'Suspended',
      statusColor: c.isActive ? 'teal' : 'red',
      joinDate: c.createdAt.toISOString().split('T')[0],
      totalOrders: 0,
      walletBalance: 0,
      isPremium: false,
      lastActive: 'Just now'
    }));

    res.status(200).json({ success: true, data: formattedCustomers });
  } catch (error) { next(error); }
};

const toggleCustomerSuspension = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, error: { message: 'Customer not found' } });
    }
    
    customer.isActive = !customer.isActive;
    await customer.save();
    
    res.status(200).json({ success: true, isActive: customer.isActive });
  } catch (error) { next(error); }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // KPI: Today's Orders & Revenue
    const todaysOrders = await Order.find({ createdAt: { $gte: today } });
    const yesterdaysOrders = await Order.find({ createdAt: { $gte: yesterday, $lt: today } });

    const todayRevenuePaise = todaysOrders.reduce((sum, o) => sum + o.totalPaise, 0);
    const yesterdayRevenuePaise = yesterdaysOrders.reduce((sum, o) => sum + o.totalPaise, 0);

    const todayRevenue = todayRevenuePaise / 100;
    const yesterdayRevenue = yesterdayRevenuePaise / 100;
    
    // Revenue trend
    let revenueTrend = 0;
    if (yesterdayRevenue > 0) {
      revenueTrend = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
    } else if (todayRevenue > 0) {
      revenueTrend = 100; // infinite growth from 0
    }

    // Orders trend
    let ordersTrend = 0;
    if (yesterdaysOrders.length > 0) {
      ordersTrend = ((todaysOrders.length - yesterdaysOrders.length) / yesterdaysOrders.length) * 100;
    } else if (todaysOrders.length > 0) {
      ordersTrend = 100;
    }

    const lowStockProductsCount = await Product.countDocuments({ stock: { $lt: 10 } });
    
    // KPI: Active Subscriptions
    const activeSubscriptionsCount = await Subscription.countDocuments({ status: 'Active' });

    // Recent Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'displayName email phone');

    // Chart logic
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 6);

    const ordersLast7Days = await Order.find({ createdAt: { $gte: last7Days } });

    const chartData = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      chartData[dateStr] = { revenue: 0, orders: 0 };
    }

    ordersLast7Days.forEach(o => {
      const dateStr = new Date(o.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (chartData[dateStr]) {
        chartData[dateStr].revenue += o.totalPaise / 100;
        chartData[dateStr].orders += 1;
      }
    });

    const revenueChart = {
      labels: Object.keys(chartData),
      data: Object.values(chartData).map(d => d.revenue)
    };

    const ordersChart = {
      labels: Object.keys(chartData),
      data: Object.values(chartData).map(d => d.orders)
    };

    res.json({
      success: true,
      data: {
        kpi: {
          todayRevenue: todayRevenue,
          revenueTrend: revenueTrend.toFixed(1),
          todayOrders: todaysOrders.length,
          ordersTrend: ordersTrend.toFixed(1),
          activeSubscriptions: activeSubscriptionsCount,
          subscriptionsTrend: 0,
          activeDeliveries: 0,
          deliveriesTrend: 0,
          onlineRiders: 0,
          ridersTrend: 0,
          lowStockProducts: lowStockProductsCount,
          lowStockTrend: 0
        },
        charts: {
          revenue: revenueChart,
          orders: ordersChart
        },
        recentOrders: recentOrders,
        topProducts: [] 
      }
    });
  } catch (error) { next(error); }
};

const getInventory = async (req, res, next) => {
  try {
    const products = await Product.find()
      .populate('category', 'name')
      .lean();

    const items = products.map(p => {
      const v = p.variants[0] || {};
      const stock = v.stockQuantity || 0;
      const stockStatus = stock === 0 ? 'Out of Stock' : stock < 10 ? 'Low Stock' : 'In Stock';
      const statusColor = stock === 0 ? 'red' : stock < 10 ? 'orange' : 'green';
      return {
        id: p._id,
        name: p.name,
        variant: `${v.weightOrVolume || ''} ${v.unit || ''}`.trim(),
        sku: v.sku || 'N/A',
        category: p.category?.name || 'Uncategorized',
        stock,
        stockStatus,
        statusColor,
        image: p.images?.[0] || '',
        price: (v.discountPricePaise || v.pricePaise || 0) / 100,
        updatedAt: p.updatedAt,
      };
    });

    const total = items.length;
    const inStock = items.filter(i => i.stockStatus === 'In Stock').length;
    const lowStock = items.filter(i => i.stockStatus === 'Low Stock').length;
    const outOfStock = items.filter(i => i.stockStatus === 'Out of Stock').length;

    res.json({
      success: true,
      data: { kpi: { total, inStock, lowStock, outOfStock }, items }
    });
  } catch (err) { next(err); }
};

const getPayments = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'displayName email phone')
      .lean();

    const orderItems = orders.map(o => ({
      id: o._id,
      orderNumber: o.orderNumber,
      customer: o.user?.displayName || 'Guest',
      phone: o.user?.phone || '',
      amount: o.totalPaise / 100,
      method: o.paymentMethod?.toUpperCase() || 'COD',
      status: o.paymentStatus,
      statusColor: o.paymentStatus === 'paid' ? 'green' : o.paymentStatus === 'failed' ? 'red' : 'amber',
      date: o.createdAt,
      type: 'regular'
    }));

    const bulkOrders = await BulkOrder.find()
      .sort({ createdAt: -1 })
      .populate('user', 'displayName email phone')
      .lean();

    const bulkItems = bulkOrders.map(b => ({
      id: b._id,
      orderNumber: 'BLK-' + b._id.toString().substring(18).toUpperCase(),
      customer: b.user?.displayName || 'Guest (Bulk)',
      phone: b.user?.phone || '',
      amount: b.advancePaid ? (b.advancePayment || b.totalPrice) : b.totalPrice,
      method: b.paymentMethod?.toUpperCase() || 'UPI',
      status: b.advancePaid ? 'paid' : 'pending',
      statusColor: b.advancePaid ? 'green' : 'amber',
      date: b.createdAt,
      type: 'bulk'
    }));

    const items = [...orderItems, ...bulkItems].sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalRevenue = items
      .filter(i => i.status === 'paid')
      .reduce((s, i) => s + i.amount, 0);
    const pending = items.filter(i => i.status === 'pending').length;
    const paid = items.filter(i => i.status === 'paid').length;
    const failed = items.filter(i => i.status === 'failed').length;

    res.json({
      success: true,
      data: { kpi: { totalRevenue, pending, paid, failed }, items }
    });
  } catch (err) { next(err); }
};

const getDeliverySchedule = async (req, res, next) => {
  try {
    const { date } = req.query; // 'Today', 'Tomorrow', 'All', or specific date.
    
    // Determine the date range to look for based on input
    const targetDates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date === 'Today') {
      targetDates.push({ label: 'Today', date: today });
    } else if (date === 'Tomorrow') {
      targetDates.push({ label: 'Tomorrow', date: tomorrow });
    } else {
      // Default to "All" (Today + Tomorrow for now to keep list manageable)
      targetDates.push({ label: 'Today', date: today });
      targetDates.push({ label: 'Tomorrow', date: tomorrow });
    }

    // 1. Fetch Active/Pending Subscriptions
    const subscriptions = await Subscription.find({ status: { $in: ['Active', 'Pending'] } })
      .populate('user', 'displayName phone email')
      .populate('deliveryPartner', 'displayName phone')
      .lean();

    const subscriptionDeliveries = [];

    subscriptions.forEach(sub => {
      const start = new Date(sub.startDate);
      start.setHours(0, 0, 0, 0);

      targetDates.forEach(target => {
        const tDate = target.date;
        
        // Subscription hasn't started yet
        if (start > tDate) return;

        let isDue = false;
        const diffTime = Math.abs(tDate - start);
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
            isDue = start.getDay() === tDate.getDay();
            break;
          case 'Monthly':
            isDue = start.getDate() === tDate.getDate();
            break;
        }

        let isSkipped = false;
        if (sub.skippedDeliveries && sub.skippedDeliveries.length > 0) {
          isSkipped = sub.skippedDeliveries.some(skippedDate => {
            const sd = new Date(skippedDate);
            sd.setHours(0, 0, 0, 0);
            return sd.getTime() === tDate.getTime();
          });
        }

        if (isDue && !isSkipped) {
          subscriptionDeliveries.push({
            id: `sub_${sub._id}_${target.label}`,
            subscriptionId: sub._id,
            date: target.label,
            timeWindow: sub.deliveryTime || 'Standard',
            customerName: sub.user?.displayName || 'Unknown Customer',
            phone: sub.user?.phone || 'N/A',
            address: sub.address ? `${sub.address.apartment ? sub.address.apartment + ', ' : ''}${sub.address.street || ''}` : 'N/A',
            items: `${sub.quantity}x ${sub.productName}`,
            driver: sub.deliveryPartner?.displayName || 'Unassigned',
            driverId: sub.deliveryPartner?._id || null,
            route: sub.planName || 'Subscription',
            status: 'Scheduled',
            statusColor: 'teal',
            type: 'Subscription',
            instructions: sub.specialInstructions || '',
            paymentMethod: sub.paymentMethod || 'N/A',
            leaveAtDoor: sub.leaveAtDoor || false,
            callBeforeDelivery: sub.callBeforeDelivery || false,
          });
        }
      });
    });

    // 2. Fetch Pending/Confirmed Regular Orders
    const orders = await Order.find({ status: { $in: ['pending', 'confirmed', 'out_for_delivery'] } })
      .populate('user', 'displayName phone email')
      .populate('deliveryPartner', 'displayName phone')
      .lean();

    const orderDeliveries = [];
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      orderDate.setHours(0, 0, 0, 0);

      targetDates.forEach(target => {
        const tDate = target.date;
        // For simplicity, assume all pending orders created <= target date are due on target date
        if (orderDate.getTime() <= tDate.getTime()) {
          const address = order.deliveryAddressSnapshot || order.deliveryAddress;
          orderDeliveries.push({
            id: `ord_${order._id}_${target.label}`,
            orderId: order._id,
            date: target.label,
            timeWindow: order.deliveryTimePref || 'Standard (Anytime)',
            customerName: order.user?.displayName || 'Guest',
            phone: order.user?.phone || 'N/A',
            address: address ? `${address.addressLine1 || ''} ${address.addressLine2 || ''}, ${address.city || ''}`.trim().replace(/^, |, $/g, '') : 'N/A',
            items: `${order.items?.length || 0} items`,
            driver: order.deliveryPartner?.displayName || 'Unassigned',
            driverId: order.deliveryPartner?._id || null,
            route: 'Standard Order',
            status: order.status === 'out_for_delivery' ? 'Dispatched' : 'Pending',
            statusColor: order.status === 'out_for_delivery' ? 'blue' : 'amber',
            type: 'Order',
            instructions: order.customerNotes || '',
            paymentMethod: order.paymentMethod || 'N/A',
            leaveAtDoor: false,
            callBeforeDelivery: false,
          });
        }
      });
    });

    // Merge and sort (Today first, Tomorrow second)
    let allDeliveries = [...subscriptionDeliveries, ...orderDeliveries];
    allDeliveries.sort((a, b) => a.date === 'Today' ? -1 : 1);

    res.json({
      success: true,
      data: allDeliveries
    });
  } catch (err) {
    next(err);
  }
};

const markDeliveryDelivered = async (req, res, next) => {
  try {
    const { deliveryId, deliveryDate } = req.body;
    
    if (deliveryId && deliveryId.startsWith('sub_')) {
      const parts = deliveryId.split('_');
      const subId = parts[1];
      
      const sub = await Subscription.findById(subId);
      if (sub) {
        const dateObj = deliveryDate ? new Date(deliveryDate) : new Date();
        dateObj.setHours(0,0,0,0);
        
        // Prevent duplicate marking
        const alreadyMarked = sub.completedDeliveries && sub.completedDeliveries.some(d => {
          const sd = new Date(d);
          sd.setHours(0,0,0,0);
          return sd.getTime() === dateObj.getTime();
        });

        if (!alreadyMarked) {
          sub.completedDeliveries = sub.completedDeliveries || [];
          sub.completedDeliveries.push(dateObj);
          await sub.save();
        }
        
        return res.json({ success: true, message: 'Subscription delivery marked as delivered' });
      } else {
        return res.status(404).json({ success: false, message: 'Subscription not found' });
      }
    } else if (deliveryId && deliveryId.startsWith('ord_')) {
      const parts = deliveryId.split('_');
      const orderId = parts[1];
      
      const order = await Order.findById(orderId);
      if (order) {
        if (order.status !== 'delivered') {
          order.status = 'delivered';
          order.deliveredAt = new Date();
          await order.save();
          if (order.deliveryPartner) {
            const feeRupees = order.deliveryFeePaise > 0 ? (order.deliveryFeePaise / 100) : 20;
            const partner = await User.findById(order.deliveryPartner);
            if (partner) {
              partner.walletBalance = (partner.walletBalance || 0) + feeRupees;
              await partner.save();
              await Transaction.create({
                user: order.deliveryPartner,
                type: 'credit',
                amount: feeRupees,
                order: order._id,
                description: `Earning for Order #${order.orderNumber}`
              });
            }
            const { evaluateIncentivesForPartner } = require('./incentiveController');
            await evaluateIncentivesForPartner(order.deliveryPartner, req.app.get('io'));
          }
        }
        return res.json({ success: true, message: 'Order marked as delivered' });
      } else {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
    }
    
    return res.status(400).json({ success: false, message: 'Invalid delivery ID' });
  } catch (error) {
    next(error);
  }
};


const addDeliveryPartner = async (req, res, next) => {
  try {
    const { name, email, phone, password, assignedStore, assignedHub, darkStore } = req.body;

    // Check if user exists in MongoDB first
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      const err = new Error('User already exists in database');
      err.statusCode = 400;
      throw err;
    }

    if (!auth) {
      const err = new Error('Firebase Admin Auth is not initialized');
      err.statusCode = 500;
      throw err;
    }

    // Create user in Firebase Auth
    const firebaseUser = await auth.createUser({
      email,
      emailVerified: false,
      password,
      displayName: name,
      disabled: false,
    });

    // Create user in MongoDB with automatic joinedDate
    const now = new Date();
    const newUser = await User.create({
      firebaseUid: firebaseUser.uid,
      email,
      phone,
      displayName: name,
      role: 'delivery',
      isActive: true,
      deliveryDetails: {
        assignedStore: assignedStore || assignedHub || darkStore || null,
        assignedHub: assignedHub || assignedStore || darkStore || null,
        joinedDate: now.toISOString()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: newUser._id,
        name: newUser.displayName,
        email: newUser.email,
        role: newUser.role
      },
      message: 'Delivery partner created successfully'
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      error.statusCode = 400;
      error.message = 'The email address is already in use by another account.';
    }
    next(error);
  }
};


const getAllDeliveryPartners = async (req, res, next) => {
  try {
    const partners = await User.find({ role: 'delivery' })
      .select('displayName email phone isActive photoUrl createdAt')
      .sort({ createdAt: -1 });

    const formattedPartners = partners.map(p => ({
      id: p._id.toString(),
      name: p.displayName || 'Unknown Rider',
      email: p.email || 'N/A',
      phone: p.phone || 'N/A',
      avatar: p.photoUrl,
      status: p.isActive ? 'Active' : 'Suspended',
      statusColor: p.isActive ? 'teal' : 'red',
      joinDate: p.createdAt.toISOString().split('T')[0],
      totalOrders: 0,
      rating: 5.0,
      currentStatus: 'Offline'
    }));

    res.status(200).json({ success: true, data: formattedPartners });
  } catch (error) { next(error); }
};

const acceptAndDispatchOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id).populate('user', 'displayName phone email');
    
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Order is already ${order.status}` });
    }

    order.status = 'confirmed';
    order.acceptedAt = new Date();
    await order.save();

    await recordAudit('ADMIN_ORDER_ACCEPT_DISPATCH', req.auth.userId, {
      orderId: order._id,
      orderNumber: order.orderNumber
    });

    const io = req.app.get('io');
    if (io) {
      // 1. Notify user & admin
      io.to(`user_${order.user?._id || order.user}`).emit('order_status_updated', {
        orderId: order._id,
        status: 'confirmed'
      });
      io.to('admin_room').emit('order_status_updated', {
        orderId: order._id,
        status: 'confirmed'
      });

      // 2. Broadcast to ALL delivery riders for ride-like popup alert!
      const broadcastPayload = {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        totalPaise: order.totalPaise,
        totalAmount: (order.totalPaise / 100).toFixed(2),
        deliveryFeePaise: order.deliveryFeePaise,
        deliveryFee: (order.deliveryFeePaise > 0 ? order.deliveryFeePaise / 100 : 20).toFixed(2),
        deliveryAddress: order.deliveryAddressSnapshot || {},
        items: order.items || [],
        itemCount: order.items?.length || 0,
        customerName: order.user?.displayName || order.deliveryAddressSnapshot?.recipientName || 'Customer',
        customerPhone: order.user?.phone || order.deliveryAddressSnapshot?.phone || '',
        paymentMethod: order.paymentMethod,
        placedAt: order.createdAt,
        timestamp: new Date().toISOString()
      };

      io.to('delivery_room').emit('new_order_available', broadcastPayload);
      console.log(`[Socket.io] Admin accepted order #${order.orderNumber}. Broadcasted new_order_available to delivery_room.`);
    }

    res.status(200).json({
      success: true,
      message: 'Order accepted and dispatched to all delivery partners!',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

const assignOrderDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;

    const order = await Order.findById(id).populate('user', 'displayName phone');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const previousPartner = order.deliveryPartner;
    order.deliveryPartner = deliveryPartnerId || null;
    order.deliveryStatus = deliveryPartnerId ? 'ASSIGNED' : 'SEARCHING_DELIVERY_PARTNER';
    if (order.orderStatus === 'PLACED') {
      order.orderStatus = 'CONFIRMED';
    }
    order.status = deliveryPartnerId ? 'Processing' : 'Pending';

    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status: order.deliveryStatus,
      timestamp: new Date(),
      changedBy: 'ADMIN',
      notes: deliveryPartnerId ? `Admin assigned rider ${deliveryPartnerId}` : 'Admin unassigned rider'
    });

    await order.save();

    let delivery = null;
    if (order.delivery) {
      delivery = await Delivery.findById(order.delivery);
    }
    if (!delivery) {
      delivery = await Delivery.findOne({ orderId: order._id });
    }

    if (delivery) {
      delivery.deliveryPartner = deliveryPartnerId || null;
      delivery.deliveryStatus = deliveryPartnerId ? 'ASSIGNED' : 'NOT_ASSIGNED';
      delivery.assignedAt = deliveryPartnerId ? new Date() : null;
      await delivery.save();
    } else if (deliveryPartnerId) {
      delivery = await Delivery.create({
        deliveryNumber: `DEL-${order.orderNumber || order._id.toString().slice(-6)}`,
        orderType: 'NORMAL',
        orderId: order._id,
        customer: order.user?._id || order.user,
        deliveryPartner: deliveryPartnerId,
        scheduledDate: new Date(),
        deliveryAddress: {
          recipientName: order.deliveryAddressSnapshot?.recipientName || order.user?.displayName || 'Customer',
          phone: order.deliveryAddressSnapshot?.phone || order.user?.phone || '',
          addressLine1: order.deliveryAddressSnapshot?.addressLine1 || '',
          city: order.deliveryAddressSnapshot?.city || 'Noida',
          area: order.deliveryAddressSnapshot?.area || 'Sector 62'
        },
        items: (order.items || []).map(it => ({
          name: it.name,
          quantity: it.quantity,
          isWaterJar: (it.name || '').toLowerCase().includes('jar') || (it.name || '').toLowerCase().includes('20l'),
          unitPricePaise: it.pricePaise || 0
        })),
        totalJarsToDeliver: (order.items || []).reduce((sum, it) => {
          return sum + ((it.name || '').toLowerCase().includes('jar') ? it.quantity : 0);
        }, 0),
        deliveryStatus: 'ASSIGNED',
        assignedAt: new Date()
      });
      order.delivery = delivery._id;
      await order.save();
    }

    if (deliveryPartnerId) {
      await User.updateOne({ _id: deliveryPartnerId }, { availability: 'BUSY', currentActiveDelivery: delivery?._id || null });
    }
    if (previousPartner && previousPartner.toString() !== deliveryPartnerId) {
      await User.updateOne({ _id: previousPartner }, { availability: 'ONLINE', currentActiveDelivery: null });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.user?._id || order.user}`).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        deliveryStatus: order.deliveryStatus
      });
      if (deliveryPartnerId) {
        io.to(`user_${deliveryPartnerId}`).emit('targeted_delivery_request', {
          orderId: order._id,
          deliveryId: delivery?._id,
          orderNumber: order.orderNumber,
          totalAmount: (order.totalPaise / 100).toFixed(2),
          deliveryFee: '20.00',
          itemCount: order.items?.length || 1,
          customerName: order.user?.displayName || 'Customer',
          deliveryAddress: order.deliveryAddressSnapshot || {},
          items: order.items || [],
          timeoutSeconds: 60
        });
      }
    }

    res.status(200).json({
      success: true,
      message: deliveryPartnerId ? 'Driver assigned successfully' : 'Driver unassigned',
      data: order
    });
  } catch (err) {
    next(err);
  }
};

const getAllDeliveryRoutes = async (req, res, next) => {
  try {
    const { date, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(nextD.getDate() + 1);
      query.date = { $gte: d, $lt: nextD };
    }

    const routes = await DeliveryRoute.find(query)
      .sort({ date: -1, createdAt: -1 })
      .populate('deliveryPartner', 'displayName phone vehicleType availability')
      .populate({
        path: 'deliveries',
        populate: { path: 'customer', select: 'displayName phone' }
      });

    res.status(200).json({
      success: true,
      data: routes
    });
  } catch (err) {
    next(err);
  }
};

const triggerDailyBatchGeneration = async (req, res, next) => {
  try {
    const { targetDate } = req.body || {};
    const date = targetDate ? new Date(targetDate) : new Date();
    const io = req.app.get('io');
    const createdRoutes = await batchDeliveriesIntoRoutes(date, io);

    res.status(200).json({
      success: true,
      message: `Batch generation complete. ${createdRoutes.length} route(s) processed.`,
      data: createdRoutes
    });
  } catch (err) {
    next(err);
  }
};

const assignRouteDriver = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;

    const route = await DeliveryRoute.findById(id).populate('deliveries');
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    const prevPartner = route.deliveryPartner;
    route.deliveryPartner = deliveryPartnerId || null;
    route.status = deliveryPartnerId ? 'ASSIGNED' : 'CREATED';
    route.statusHistory = route.statusHistory || [];
    route.statusHistory.push({
      status: route.status,
      timestamp: new Date(),
      changedBy: 'ADMIN',
      notes: deliveryPartnerId ? `Admin assigned route to rider ${deliveryPartnerId}` : 'Admin unassigned route'
    });
    await route.save();

    if (route.deliveries && route.deliveries.length > 0) {
      const deliveryIds = route.deliveries.map(d => d._id || d);
      await Delivery.updateMany(
        { _id: { $in: deliveryIds } },
        { 
          deliveryPartner: deliveryPartnerId || null,
          deliveryStatus: deliveryPartnerId ? 'ASSIGNED' : 'NOT_ASSIGNED',
          assignedAt: deliveryPartnerId ? new Date() : null
        }
      );
    }

    if (deliveryPartnerId) {
      await User.updateOne({ _id: deliveryPartnerId }, { availability: 'BUSY', currentActiveRoute: route._id });
    }
    if (prevPartner && prevPartner.toString() !== deliveryPartnerId) {
      await User.updateOne({ _id: prevPartner }, { availability: 'ONLINE', currentActiveRoute: null });
    }

    const io = req.app.get('io');
    if (io && deliveryPartnerId) {
      io.to(`user_${deliveryPartnerId}`).emit('subscription_route_assigned', {
        routeId: route._id,
        routeNumber: route.routeNumber,
        area: route.area,
        totalStops: route.totalStops,
        totalJars: route.totalJarsToDeliver
      });
    }

    res.status(200).json({
      success: true,
      message: deliveryPartnerId ? 'Driver assigned to route successfully' : 'Driver removed from route',
      data: route
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllDeliveryPartners,
  addDeliveryPartner,
  getDashboardStats,
  getAllOrders,
  updateOrderStatus,
  acceptAndDispatchOrder,
  assignOrderDriver,
  getAllDeliveryRoutes,
  triggerDailyBatchGeneration,
  assignRouteDriver,
  getAllCustomers,
  toggleCustomerSuspension,
  getInventory,
  getPayments,
  getDeliverySchedule,
  markDeliveryDelivered
};
