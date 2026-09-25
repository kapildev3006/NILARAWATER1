const mongoose = require('mongoose');

const dutyLogSchema = new mongoose.Schema({
  deliveryPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['ONLINE', 'OFFLINE'],
    required: true,
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  endedAt: {
    type: Date,
    default: null
  },
  durationMinutes: {
    type: Number,
    default: 0
  },
  offlineUntil: {
    type: Date,
    default: null
  },
  durationOption: {
    type: String,
    enum: ['30_MINUTES', '1_HOUR', '2_HOURS', '4_HOURS', 'UNTIL_NEXT_SHIFT', 'UNTIL_CHANGED', 'NORMAL_SHIFT'],
    default: 'NORMAL_SHIFT'
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

dutyLogSchema.index({ deliveryPartner: 1, startedAt: -1 });

module.exports = mongoose.model('DutyLog', dutyLogSchema);
