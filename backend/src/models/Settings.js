const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  handlingCharge: {
    type: Number,
    required: true,
    default: 2,
  },
  deliveryFee: {
    type: Number,
    required: true,
    default: 25,
  },
  freeDeliveryMinAmount: {
    type: Number,
    required: true,
    default: 500, // E.g., free delivery over 500
  },
  customDesignMinOrder: {
    type: Number,
    required: true,
    default: 100, // Default min 100
  },
  customDesignSurcharge: {
    type: Number,
    required: true,
    default: 10, // Default 10 currency units extra per item/total
  },
  referralBonusAmount: {
    type: Number,
    required: true,
    default: 100, // Default ₹100 referral bonus
  },
  subscriptionPlans: [{
    name: { type: String, required: true },
    frequency: { type: String, enum: ['Daily', 'Alternate Days', 'Weekly', 'Monthly'], required: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    durationMonths: { type: Number, default: 1 },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    includedProducts: [{ type: String }],
    features: [{ type: String }]
  }],
  deliveryTimeSlots: {
    type: [String],
    default: [
      'Early Morning (6 AM - 8 AM)',
      'Morning (8 AM - 10 AM)',
      'Noon (10 AM - 1 PM)',
      'Afternoon (1 PM - 5 PM)',
      'Evening (5 PM - 8 PM)'
    ]
  },
  contactSupport: {
    email: { type: String, default: 'support@nilara.com' },
    chatResponseTime: { type: String, default: 'Usually replies within 5 minutes' }
  },
  faqs: [{
    question: { type: String, required: true },
    answer: { type: String, required: true }
  }],
  deliverySupport: {
    bannerTitle: { type: String, default: 'Partner Support Desk' },
    bannerSubtitle: { type: String, default: '24x7 Dedicated assistance for delivery issues, payouts, app bugs, and emergency rider safety.' },
    statusText: { type: String, default: 'Support Live' },
    isLive: { type: Boolean, default: true },
    helplineNumber: { type: String, default: '1800-102-9999' },
    helplineTiming: { type: String, default: 'Toll Free 24x7' },
    supportEmail: { type: String, default: 'partner-support@nilara.com' },
    emergencyNumber: { type: String, default: '1800-102-9999' },
    emergencyDescription: { type: String, default: 'Immediate on-road safety assistance' },
    faqs: [{
      question: { type: String, required: true },
      answer: { type: String, required: true }
    }]
  },
  carouselBanners: {
    type: [{
      img: { type: String, required: true },
      actionType: { type: String, enum: ['category', 'bulk_order'], required: true, default: 'category' },
      searchQuery: { type: String }, // optional, for filtering categories
      tabName: { type: String, default: 'Water' } // which category tab this banner belongs to
    }],
    default: []
  },
  homeBanners: {
    type: [{
      img: { type: String, required: true },
      actionType: { type: String, enum: ['category', 'bulk_order'], required: true, default: 'category' },
      searchQuery: { type: String }, // optional, for filtering categories
      tabName: { type: String, default: 'Water' } // which category tab this banner belongs to
    }],
    default: [
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644337/nilara/ge7lwgtjgbytmg2ywx8y.png', actionType: 'category', searchQuery: 'bottle', tabName: 'Water' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644338/nilara/k4w90z2fsskhbeavssyz.png', actionType: 'bulk_order', tabName: 'Water' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644339/nilara/dld7bxebwtz86hmdhjzy.png', actionType: 'category', searchQuery: '20l|can', tabName: 'Water' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644340/nilara/nm3efvopmga3qcbvpztj.png', actionType: 'category', searchQuery: 'carton', tabName: 'Water' },
      
      { img: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?q=80&w=400&auto=format&fit=crop', actionType: 'category', searchQuery: 'mustard', tabName: 'Oils' },
      { img: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?q=80&w=400&auto=format&fit=crop', actionType: 'category', searchQuery: 'sunflower', tabName: 'Oils' },
      { img: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?q=80&w=400&auto=format&fit=crop', actionType: 'category', searchQuery: 'soybean', tabName: 'Oils' },
      { img: 'https://images.unsplash.com/photo-1589927986076-2558976b34f6?q=80&w=400&auto=format&fit=crop', actionType: 'category', searchQuery: 'groundnut', tabName: 'Oils' },
      
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644783/nilara/pfoaa984o70ejuolmjkv.jpg', actionType: 'category', searchQuery: 'milk', tabName: 'Dairy' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644784/nilara/j7q1uc3kmnjipoouwexc.webp', actionType: 'category', searchQuery: 'paneer', tabName: 'Dairy' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644784/nilara/j7q1uc3kmnjipoouwexc.webp', actionType: 'category', searchQuery: 'curd', tabName: 'Dairy' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644785/nilara/efivl64tihiarhqxhoyg.jpg', actionType: 'category', searchQuery: 'butter', tabName: 'Dairy' },
      
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644787/nilara/s2pfcbkkaz6kikemjosg.jpg', actionType: 'category', searchQuery: 'rice', tabName: 'Grocery' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644784/nilara/j7q1uc3kmnjipoouwexc.webp', actionType: 'category', searchQuery: 'dals', tabName: 'Grocery' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644788/nilara/hstoeubdtddb5fczggfj.jpg', actionType: 'category', searchQuery: 'spices', tabName: 'Grocery' },
      { img: 'https://res.cloudinary.com/dwsdxem8w/image/upload/v1787644790/nilara/flxlfutolmt1arbxqqvm.jpg', actionType: 'category', searchQuery: 'dry fruits', tabName: 'Grocery' }
    ]
  },
  categoryTabs: {
    type: [{
      name: { type: String, required: true },
      img: { type: String }, // optional uploaded image
      iconName: { type: String } // optional flutter icon fallback
    }],
    default: [
      { name: "Water", iconName: "water_drop_outlined" },
      { name: "Oils", iconName: "opacity_outlined" },
      { name: "Dairy", iconName: "egg_alt_outlined" },
      { name: "Grocery", iconName: "shopping_basket_outlined" }
    ]
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);
