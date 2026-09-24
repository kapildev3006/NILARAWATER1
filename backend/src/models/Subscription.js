const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  planName: {
    type: String,
    required: true,
  },
  frequency: {
    type: String,
    enum: ['Daily', 'Alternate', 'Weekly', 'Monthly', 'Alternate Days'],
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  price: {
    type: Number,
    required: true,
  },
  discountedPrice: {
    type: Number,
  },
  deliveryTime: {
    type: String,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  address: {
    type: Object, // Stores the full address payload
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Cancelled', 'Pending'],
    default: 'Active',
  },
  skippedDeliveries: [{
    type: Date
  }],
  completedDeliveries: [{
    type: Date
  }],
  specialInstructions: {
    type: String,
  },
  leaveAtDoor: {
    type: Boolean,
    default: false,
  },
  callBeforeDelivery: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
