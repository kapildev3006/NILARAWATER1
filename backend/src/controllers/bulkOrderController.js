const BulkOrder = require('../models/BulkOrder');
const Delivery = require('../models/Delivery');
const User = require('../models/User');
const { recordAudit } = require('../models/AuditLog');
const { messaging } = require('../config/firebase');
const { determineRequiredVehicle } = require('../services/vehicleCapacityService');
const { notifyCustomerBulkOrderQuote } = require('../services/notificationService');

const createBulkOrder = async (req, res, next) => {
  try {
    const { productName, quantity, totalPrice, deliveryDate, timeSlot, paymentMethod, address, specialInstructions } = req.body;
    
    // Auto-calculate suggested vehicle based on quantity & product
    const isWaterJar = (productName || '').toLowerCase().includes('jar') || (productName || '').toLowerCase().includes('20l');
    const suggestedVehicle = determineRequiredVehicle({
      waterJarCount: isWaterJar ? Number(quantity) : 0,
      itemCount: !isWaterJar ? Number(quantity) : 0
    });

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `BLK-${dateStr}-${randomSuffix}`;

    const bulkOrder = new BulkOrder({
      orderNumber,
      user: req.auth?.userId || null,
      productName,
      quantity,
      totalPrice,
      deliveryDate,
      timeSlot,
      paymentMethod,
      address,
      specialInstructions,
      orderType: 'BULK',
      bulkStatus: 'BULK_REQUESTED',
      status: 'Pending',
      quoteDetails: {
        vehicleRequirement: suggestedVehicle
      },
      statusHistory: [{
        status: 'BULK_REQUESTED',
        timestamp: new Date(),
        changedBy: 'CUSTOMER',
        notes: `Bulk order submitted for ${quantity}x ${productName}. Vehicle estimated: ${suggestedVehicle}`
      }]
    });

    await bulkOrder.save();

    // Notify admin
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('new_bulk_order', bulkOrder);
    }

    res.status(201).json({
      success: true,
      data: bulkOrder,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const getBulkOrders = async (req, res, next) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const query = {};
    if (status && status !== 'Total') {
      query.$or = [{ status }, { bulkStatus: status }];
    }
    
    const bulkOrders = await BulkOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('user', 'displayName phone email')
      .populate('deliveryPartner', 'displayName phone deliveryDetails');

    res.json({
      success: true,
      data: bulkOrders,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const getMyBulkOrders = async (req, res, next) => {
  try {
    const userId = req.auth.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { message: "User not authenticated or missing ID" }
      });
    }

    const { status, limit = 50, page = 1 } = req.query;
    const query = { user: userId };
    if (status) query.status = status;

    const bulkOrders = await BulkOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('deliveryPartner', 'displayName phone');

    res.json({
      success: true,
      data: bulkOrders,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const submitQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quotePricePaise, advanceRequiredPaise, vehicleRequirement, adminNotes, validDays = 7 } = req.body;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    const now = new Date();
    const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

    bulkOrder.bulkStatus = 'QUOTE_SENT';
    bulkOrder.status = 'QUOTE_SENT';
    bulkOrder.quoteDetails = {
      quotePricePaise: Number(quotePricePaise) || (bulkOrder.totalPrice * 100),
      advanceRequiredPaise: Number(advanceRequiredPaise) || 0,
      vehicleRequirement: vehicleRequirement || bulkOrder.quoteDetails?.vehicleRequirement || 'LOADER',
      adminNotes: adminNotes || '',
      quotedAt: now,
      validUntil
    };

    bulkOrder.statusHistory = bulkOrder.statusHistory || [];
    bulkOrder.statusHistory.push({
      status: 'QUOTE_SENT',
      timestamp: now,
      changedBy: 'ADMIN',
      notes: `Quote sent: ₹${(bulkOrder.quoteDetails.quotePricePaise / 100).toFixed(2)}. Vehicle required: ${bulkOrder.quoteDetails.vehicleRequirement}`
    });

    await bulkOrder.save();

    const io = req.app.get('io');
    if (io && bulkOrder.user) {
      io.to(`user_${bulkOrder.user}`).emit('bulk_quote_received', {
        bulkOrderId: bulkOrder._id,
        quoteDetails: bulkOrder.quoteDetails
      });
    }

    notifyCustomerBulkOrderQuote(bulkOrder).catch(err => {
      console.error('[BulkOrderController] Error pushing quote notification:', err.message);
    });

    res.status(200).json({
      success: true,
      message: 'Quote sent to customer successfully',
      data: bulkOrder
    });
  } catch (err) {
    next(err);
  }
};

const customerApproveQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.auth.userId;

    const bulkOrder = await BulkOrder.findOne({ _id: id, user: userId });
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    if (bulkOrder.bulkStatus !== 'QUOTE_SENT') {
      return res.status(400).json({ success: false, message: 'Quote must be sent before approval' });
    }

    const now = new Date();
    bulkOrder.bulkStatus = 'CUSTOMER_APPROVED';
    bulkOrder.status = 'Confirmed';
    if (!bulkOrder.quoteDetails) bulkOrder.quoteDetails = {};
    bulkOrder.quoteDetails.customerApprovedAt = now;

    bulkOrder.statusHistory = bulkOrder.statusHistory || [];
    bulkOrder.statusHistory.push({
      status: 'CUSTOMER_APPROVED',
      timestamp: now,
      changedBy: 'CUSTOMER',
      notes: 'Customer accepted the quotation'
    });

    await bulkOrder.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('bulk_quote_approved', {
        bulkOrderId: bulkOrder._id,
        customerName: req.auth.displayName
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quotation approved successfully',
      data: bulkOrder
    });
  } catch (err) {
    next(err);
  }
};

const dispatchBulkOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId, vehicleType, vehicleNumber } = req.body;

    const bulkOrder = await BulkOrder.findById(id).populate('user', 'displayName phone');
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    const now = new Date();
    bulkOrder.bulkStatus = 'DISPATCHED';
    bulkOrder.status = 'Processing';
    bulkOrder.deliveryPartner = deliveryPartnerId;

    // Create a Delivery entity for this bulk trip
    const deliveryNumber = `DEL-${bulkOrder.orderNumber || bulkOrder._id.toString().slice(-6)}`;
    const delivery = await Delivery.create({
      deliveryNumber,
      orderType: 'BULK',
      bulkOrderId: bulkOrder._id,
      customer: bulkOrder.user?._id || bulkOrder.user,
      deliveryPartner: deliveryPartnerId,
      scheduledDate: now,
      vehicleType: vehicleType || bulkOrder.quoteDetails?.vehicleRequirement || 'LOADER',
      deliveryAddress: {
        recipientName: bulkOrder.address?.name || bulkOrder.user?.displayName || 'Customer',
        phone: bulkOrder.address?.phone || bulkOrder.user?.phone || '',
        addressLine1: bulkOrder.address?.street || bulkOrder.address?.addressLine1 || '',
        city: bulkOrder.address?.city || 'Noida',
        area: bulkOrder.address?.city || 'Commercial Zone'
      },
      items: [{
        name: bulkOrder.productName,
        quantity: bulkOrder.quantity,
        isWaterJar: (bulkOrder.productName || '').toLowerCase().includes('jar') || (bulkOrder.productName || '').toLowerCase().includes('20l'),
        unitPricePaise: bulkOrder.quoteDetails?.quotePricePaise || (bulkOrder.totalPrice * 100)
      }],
      totalJarsToDeliver: (bulkOrder.productName || '').toLowerCase().includes('jar') ? bulkOrder.quantity : 0,
      deliveryStatus: 'OUT_FOR_DELIVERY',
      pickedUpAt: now
    });

    bulkOrder.delivery = delivery._id;
    bulkOrder.statusHistory = bulkOrder.statusHistory || [];
    bulkOrder.statusHistory.push({
      status: 'DISPATCHED',
      timestamp: now,
      changedBy: 'ADMIN',
      notes: `Dispatched via ${vehicleType || 'Commercial Vehicle'} (${vehicleNumber || 'Standard'})`
    });

    await bulkOrder.save();

    // Mark driver as busy
    await User.updateOne({ _id: deliveryPartnerId }, { availability: 'BUSY', currentActiveDelivery: delivery._id });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${deliveryPartnerId}`).emit('bulk_trip_assigned', {
        bulkOrderId: bulkOrder._id,
        deliveryId: delivery._id,
        orderNumber: bulkOrder.orderNumber,
        productName: bulkOrder.productName,
        quantity: bulkOrder.quantity,
        vehicleRequirement: vehicleType || bulkOrder.quoteDetails?.vehicleRequirement
      });
      if (bulkOrder.user) {
        io.to(`user_${bulkOrder.user}`).emit('bulk_order_dispatched', {
          bulkOrderId: bulkOrder._id,
          deliveryId: delivery._id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Bulk order dispatched with vehicle and delivery partner',
      data: { bulkOrder, delivery }
    });
  } catch (err) {
    next(err);
  }
};

const updateBulkOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, advancePayment, remainingPayment, adminMessage } = req.body;

    const bulkOrder = await BulkOrder.findById(id);
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    bulkOrder.status = status;
    if (status === 'Confirmed') bulkOrder.bulkStatus = 'CONFIRMED';
    if (status === 'Processing') bulkOrder.bulkStatus = 'PROCESSING';
    if (status === 'Delivered') bulkOrder.bulkStatus = 'DELIVERED';
    if (status === 'Cancelled') bulkOrder.bulkStatus = 'CANCELLED';

    if (advancePayment !== undefined) bulkOrder.advancePayment = Number(advancePayment);
    if (remainingPayment !== undefined) bulkOrder.remainingPayment = Number(remainingPayment);
    if (adminMessage !== undefined) bulkOrder.adminMessage = adminMessage;

    await bulkOrder.save();

    res.json({
      success: true,
      data: bulkOrder,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

const payAdvanceToken = async (req, res, next) => {
  try {
    const { id } = req.params;
    const bulkOrder = await BulkOrder.findById(id);
    
    if (!bulkOrder) {
      return res.status(404).json({ success: false, message: 'Bulk order not found' });
    }

    bulkOrder.advancePaid = true;
    bulkOrder.bulkStatus = 'CONFIRMED';
    bulkOrder.status = 'Confirmed';
    await bulkOrder.save();

    res.json({
      success: true,
      data: bulkOrder,
      requestId: req.requestId
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBulkOrder,
  getBulkOrders,
  getMyBulkOrders,
  submitQuote,
  customerApproveQuote,
  dispatchBulkOrder,
  updateBulkOrderStatus,
  payAdvanceToken
};
