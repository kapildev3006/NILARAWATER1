const mongoose = require('mongoose');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Address = require('../models/Address');
const { recordAudit } = require('../models/AuditLog');
const { notifyCustomerOrderPlaced } = require('../services/notificationService');

const generateOrderNumber = () => {
  const date = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${date}-${randomStr}`;
};

const checkout = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, deliveryAddressId, paymentMethod, customerNotes, deliveryTimePref } = req.body;
    const userId = req.auth.userId;

    // 1. Verify address ownership
    const address = await Address.findOne({ _id: deliveryAddressId, user: userId }).session(session);
    if (!address) {
      const err = new Error('Delivery address not found or does not belong to user');
      err.statusCode = 404;
      throw err;
    }

    // Snapshot address
    const deliveryAddressSnapshot = {
      recipientName: address.recipientName,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      location: address.location
    };

    const orderItems = [];
    let subtotalPaise = 0;

    // 2. Validate items, pricing, and deduct stock atomically
    for (const item of items) {
      // Find the product and specifically the variant, ensuring enough stock exists
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          isActive: true,
          'variants._id': item.variantId,
          'variants.stockQuantity': { $gte: item.quantity }
        },
        {
          $inc: { 'variants.$.stockQuantity': -item.quantity }
        },
        { new: true, session }
      );

      if (!product) {
        // Rollback explicitly just in case, though session.abortTransaction() handles it
        const err = new Error(`Item ${item.productId} (Variant: ${item.variantId}) is out of stock or inactive`);
        err.statusCode = 409;
        err.code = 'OUT_OF_STOCK';
        throw err;
      }

      const variant = product.variants.id(item.variantId);
      const unitPricePaise = variant.discountPricePaise || variant.pricePaise;
      const totalPricePaise = unitPricePaise * item.quantity;

      subtotalPaise += totalPricePaise;

      orderItems.push({
        productId: product._id,
        variantId: variant._id,
        name: `${product.name} - ${variant.name}`,
        imageUrl: product.images[0] || '',
        quantity: item.quantity,
        unitPricePaise,
        totalPricePaise
      });
    }

    // 3. Calculate final totals (mocking tax/delivery fee logic for now)
    const deliveryFeePaise = subtotalPaise > 50000 ? 0 : 5000; // Free delivery over ₹500, else ₹50
    const taxPaise = Math.floor(subtotalPaise * 0.05); // Flat 5% tax mock
    const discountPaise = 0; // Coupon logic placeholder
    const totalPaise = subtotalPaise + deliveryFeePaise + taxPaise - discountPaise;

    // 4. Create Order
    const orderNumber = generateOrderNumber();
    const order = await Order.create([{
      orderNumber,
      user: userId,
      items: orderItems,
      subtotalPaise,
      discountPaise,
      deliveryFeePaise,
      taxPaise,
      totalPaise,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'PENDING' : 'PAID',
      orderType: 'NORMAL',
      orderStatus: 'CONFIRMED',
      deliveryStatus: 'SEARCHING_DELIVERY_PARTNER',
      status: 'confirmed',
      deliveryAddressSnapshot,
      customerNotes,
      deliveryTimePref,
      placedAt: new Date(),
      statusHistory: [{
        status: 'CONFIRMED',
        timestamp: new Date(),
        changedBy: 'SYSTEM',
        notes: 'Order placed and stock deducted atomically'
      }]
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const createdOrder = order[0];

    // Notify admin room for live monitoring
    req.app.get('io').to('admin_room').emit('new_order', createdOrder);

    // Automatically initiate single-rider dispatch with 30s timeout lock
    const { startNormalOrderDispatch } = require('../services/dispatchService');
    startNormalOrderDispatch(createdOrder._id, req.app.get('io')).catch(err => {
      console.error('Error starting normal order dispatch:', err);
    });

    // Notify customer via FCM push notification
    notifyCustomerOrderPlaced(createdOrder).catch(err => {
      console.error('[OrderController] Error sending order placed push:', err.message);
    });

    res.status(201).json({
      success: true,
      data: createdOrder,
      requestId: req.requestId
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};

const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    const orders = await Order.find({ user: req.auth.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
      
    const total = await Order.countDocuments({ user: req.auth.userId });
    
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

const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.auth.userId }).lean();
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    res.status(200).json({
      success: true,
      data: order,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const mockPayOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.auth.userId });
    if (!order) {
      const err = new Error('Order not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, error: { message: 'Order is already paid' } });
    }
    
    order.paymentStatus = 'paid';
    order.status = 'confirmed';
    order.acceptedAt = new Date();
    await order.save();
    
    res.status(200).json({
      success: true,
      data: order,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const deleteOrder = async (req, res, next) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({ _id: orderId, user: req.auth.userId });
    
    if (!order) {
      const err = new Error('Order not found or unauthorized');
      err.statusCode = 404;
      throw err;
    }
    
    await Order.findByIdAndDelete(orderId);
    
    res.status(200).json({ success: true, message: 'Order completely deleted from database' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkout,
  getMyOrders,
  getOrderById,
  mockPayOrder,
  deleteOrder
};
