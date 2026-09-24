const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  deliveryNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  orderType: {
    type: String,
    enum: ['NORMAL', 'BULK', 'SUBSCRIPTION'],
    required: true,
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    index: true
  },
  bulkOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BulkOrder',
    index: true
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
    index: true
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRoute',
    index: true
  },
  stopIndex: {
    type: Number,
    default: 0
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  scheduledDate: {
    type: Date,
    required: true,
    index: true
  },
  timeSlot: {
    start: { type: String },
    end: { type: String },
    label: { type: String }
  },
  pickupLocation: {
    name: { type: String, default: 'Nilara Central Warehouse' },
    address: { type: String, default: 'Plot 42, Sector 62, Noida, UP' },
    phone: { type: String, default: '+91 9876543210' },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [77.3639, 28.6200]
    }
  },
  deliveryAddress: {
    recipientName: { type: String },
    phone: { type: String },
    addressLine1: { type: String },
    addressLine2: { type: String },
    landmark: { type: String },
    city: { type: String },
    state: { type: String },
    postalCode: { type: String },
    area: { type: String },
    coordinates: [Number]
  },
  vehicleType: {
    type: String,
    enum: ['BIKE', 'SCOOTER', 'E_RICKSHAW', 'LOADER', 'PICKUP_VAN', 'MINI_TRUCK'],
    default: 'BIKE'
  },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    isWaterJar: { type: Boolean, default: false },
    unitPricePaise: { type: Number, default: 0 }
  }],
  totalJarsToDeliver: {
    type: Number,
    default: 0
  },
  jarsDelivered: {
    type: Number,
    default: 0
  },
  emptyJarsCollected: {
    type: Number,
    default: 0
  },
  specialInstructions: {
    type: String,
    trim: true
  },
  leaveAtDoor: {
    type: Boolean,
    default: false
  },
  callBeforeDelivery: {
    type: Boolean,
    default: false
  },
  deliveryFeePaise: {
    type: Number,
    default: 2000 // 20.00 INR default drop fee
  },
  deliveryStatus: {
    type: String,
    enum: [
      'NOT_ASSIGNED',
      'SEARCHING_DELIVERY_PARTNER',
      'ASSIGNED',
      'ARRIVED_AT_PICKUP',
      'PICKED_UP',
      'OUT_FOR_DELIVERY',
      'ARRIVED_AT_CUSTOMER',
      'DELIVERED',
      'CUSTOMER_UNAVAILABLE',
      'DELIVERY_FAILED',
      'SKIPPED',
      'CANCELLED'
    ],
    default: 'NOT_ASSIGNED',
    index: true
  },
  assignedAt: { type: Date },
  arrivedAtPickupAt: { type: Date },
  pickedUpAt: { type: Date },
  arrivedAtCustomerAt: { type: Date },
  deliveredAt: { type: Date },
  failedAt: { type: Date },
  failureReason: { type: String },

  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'SYSTEM' }, // 'SYSTEM', 'VENDOR', 'DRIVER', 'ADMIN'
    notes: { type: String }
  }]
}, {
  timestamps: true
});

deliverySchema.index({ deliveryPartner: 1, deliveryStatus: 1, scheduledDate: 1 });
deliverySchema.index({ customer: 1, scheduledDate: -1 });
deliverySchema.index({ routeId: 1, stopIndex: 1 });

module.exports = mongoose.model('Delivery', deliverySchema);
