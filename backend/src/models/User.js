const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  password: {
    type: String
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    sparse: true // sparse because phone login might not have email initially
  },
  phone: {
    type: String,
    trim: true,
    sparse: true
  },
  displayName: {
    type: String,
    trim: true
  },
  photoUrl: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'delivery', 'admin'],
    default: 'customer'
  },
  permissions: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  dob: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  emergencyContact: {
    type: String,
    default: ""
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  walletBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  availability: {
    type: String,
    enum: ['ONLINE', 'OFFLINE', 'BUSY'],
    default: 'ONLINE',
    index: true
  },
  currentActiveDelivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  currentActiveRoute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryRoute'
  },
  jarBalance: {
    heldJars: { type: Number, default: 0 },
    returnedJars: { type: Number, default: 0 }
  },
  deliveryDetails: {
    aadharNumber: { type: String },
    aadharImage: { type: String },
    drivingLicenseNumber: { type: String },
    drivingLicenseImage: { type: String },
    vehicleType: { type: String },
    vehicleNumber: { type: String },
    vehicleFrontImage: { type: String },
    vehicleBackImage: { type: String },
    rcImage: { type: String },
    assignedHub: { type: String },
    assignedStore: { type: String },
    darkStore: { type: String },
    joinedDate: { type: String },
    bankDetails: {
      accountHolderName: { type: String },
      accountNumber: { type: String },
      ifscCode: { type: String },
      bankName: { type: String },
      accountType: { type: String, default: 'Savings' },
      upiId: { type: String },
      payoutFrequency: { type: String, default: 'Daily' },
      payoutMode: { type: String, default: 'Bank Transfer' }
    },
    preferences: {
      navigationApp: { type: String, default: 'OpenStreetMap' },
      autoCenterMap: { type: Boolean, default: true },
      voiceRoutePrompts: { type: Boolean, default: true },
      highContrastMap: { type: Boolean, default: false },
      offlineMapCaching: { type: Boolean, default: true },
      language: { type: String, default: 'English' },
      alertTone: { type: String, default: 'Loud Ring' },
      soundVolume: { type: Number, default: 85 },
      vibrateOnAlert: { type: Boolean, default: true }
    }
  },
  fcmTokens: [{
    type: String,
    trim: true
  }],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

