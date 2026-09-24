const mongoose = require('mongoose');

const bulkOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow guest bulk orders for now if user app doesn't enforce auth
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  },
  deliveryDate: {
    type: String,
    required: true
  },
  timeSlot: {
    type: String,
    required: true
  },
  address: {
    type: Object,
    required: false
  },
  paymentMethod: {
    type: String,
    required: true,
    default: 'UPI'
  },
  orderType: {
    type: String,
    enum: ['BULK'],
    default: 'BULK'
  },
  orderNumber: {
    type: String,
    index: true
  },
  bulkStatus: {
    type: String,
    enum: [
      'BULK_REQUESTED',
      'UNDER_REVIEW',
      'QUOTE_SENT',
      'CUSTOMER_APPROVED',
      'CONFIRMED',
      'PROCESSING',
      'READY_FOR_DISPATCH',
      'DISPATCHED',
      'DELIVERED',
      'REJECTED',
      'CANCELLED'
    ],
    default: 'BULK_REQUESTED',
    index: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Processing', 'Delivered', 'Cancelled', 'BULK_REQUESTED', 'UNDER_REVIEW', 'QUOTE_SENT', 'CUSTOMER_APPROVED', 'READY_FOR_DISPATCH', 'DISPATCHED', 'REJECTED'],
    default: 'Pending'
  },
  quoteDetails: {
    quotePricePaise: { type: Number, default: 0 },
    advanceRequiredPaise: { type: Number, default: 0 },
    vehicleRequirement: {
      type: String,
      enum: ['BIKE', 'SCOOTER', 'E_RICKSHAW', 'LOADER', 'PICKUP_VAN', 'MINI_TRUCK'],
      default: 'LOADER'
    },
    adminNotes: { type: String },
    quotedAt: { type: Date },
    validUntil: { type: Date },
    customerApprovedAt: { type: Date }
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
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
    required: false
  },
  advancePayment: {
    type: Number,
    default: 0
  },
  remainingPayment: {
    type: Number,
    default: 0
  },
  adminMessage: {
    type: String,
    required: false
  },
  advancePaid: {
    type: Boolean,
    default: false
  },
  customDesign: {
    type: Object,
    required: false
  },
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'SYSTEM' },
    notes: { type: String }
  }]
}, { timestamps: true });

// Add index for fast querying by status
bulkOrderSchema.index({ status: 1 });
// Add index for fast querying by user
bulkOrderSchema.index({ user: 1 });

module.exports = mongoose.model('BulkOrder', bulkOrderSchema);
