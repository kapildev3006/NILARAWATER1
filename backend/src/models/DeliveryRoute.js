const mongoose = require('mongoose');

const deliveryRouteSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  area: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true },
    label: { type: String }
  },
  deliveries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  }],
  totalStops: {
    type: Number,
    default: 0
  },
  completedStops: {
    type: Number,
    default: 0
  },
  failedStops: {
    type: Number,
    default: 0
  },
  totalJarsToDeliver: {
    type: Number,
    default: 0
  },
  totalJarsDelivered: {
    type: Number,
    default: 0
  },
  totalEmptyJarsCollected: {
    type: Number,
    default: 0
  },
  vehicleType: {
    type: String,
    enum: ['BIKE', 'SCOOTER', 'E_RICKSHAW', 'LOADER', 'PICKUP_VAN', 'MINI_TRUCK'],
    default: 'BIKE'
  },
  status: {
    type: String,
    enum: ['CREATED', 'ASSIGNED', 'STARTED', 'COMPLETED', 'CANCELLED'],
    default: 'CREATED',
    index: true
  },
  startedAt: { type: Date },
  completedAt: { type: Date },

  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    changedBy: { type: String, default: 'SYSTEM' },
    notes: { type: String }
  }]
}, {
  timestamps: true
});

deliveryRouteSchema.index({ deliveryPartner: 1, date: 1, status: 1 });
deliveryRouteSchema.index({ area: 1, date: 1 });

module.exports = mongoose.model('DeliveryRoute', deliveryRouteSchema);
