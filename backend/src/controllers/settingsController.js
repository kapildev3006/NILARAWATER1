const Settings = require('../models/Settings');

// @desc    Get global settings
// @route   GET /api/v1/settings
// @access  Public
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create defaults if not exists
      settings = await Settings.create({});
    }
    
    // Seed homeBanners if they are empty
    if (!settings.homeBanners || settings.homeBanners.length === 0) {
      settings.homeBanners = [
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
      ];
      await settings.save();
    }
    // Seed categoryTabs if they are empty
    // Seed categoryTabs if they are empty
    if (!settings.categoryTabs || settings.categoryTabs.length === 0) {
      settings.categoryTabs = [
        { name: "Water", iconName: "water_drop_outlined" },
        { name: "Oils", iconName: "opacity_outlined" },
        { name: "Dairy", iconName: "egg_alt_outlined" },
        { name: "Grocery", iconName: "shopping_basket_outlined" }
      ];
      await settings.save();
    }

    // Seed customer FAQs if empty or only 1 item
    if (!settings.faqs || settings.faqs.length <= 1) {
      settings.faqs = [
        {
          question: "How do I cancel or pause my subscription plan?",
          answer: "You can pause deliveries anytime from the Subscriptions page using Vacation Mode. Active prepaid plan cycles are non-refundable once started, but remaining bottles will continue to be delivered until the plan period concludes."
        },
        {
          question: "What time will my morning milk and water be delivered?",
          answer: "Our doorstep morning delivery arrives fresh between 6:00 AM and 8:00 AM every morning. You will receive an instant notification as soon as our delivery partner completes your drop-off."
        },
        {
          question: "Can I pause my daily deliveries when going on vacation?",
          answer: "Yes! Simply go to Subscriptions > Vacation Mode, select your start and end dates, and your deliveries will automatically pause and resume without losing any remaining subscription balance."
        },
        {
          question: "How does the 20L Water Can security deposit and return work?",
          answer: "A refundable deposit is collected on your first 20L can. Whenever you order a refill or cancel, hand over the empty undamaged Nilara can to the delivery partner for an instant deposit refund credited to your Nilara Wallet."
        },
        {
          question: "How do I order custom labeled bottles for weddings or events?",
          answer: "Navigate to the 'Custom Design' section from the home screen, select your preferred bottle size, upload your artwork or logo, and choose quantity for bulk pricing and doorstep event delivery."
        },
        {
          question: "What should I do if an item is missing or damaged in my order?",
          answer: "Open your order details or tap 'My Support Tickets' above and report the issue with a photo within 24 hours. Our support team will promptly issue an instant wallet refund or schedule a free replacement."
        },
        {
          question: "How do Nilara Wallet refunds and referral credits work?",
          answer: "Refunds for cancelled orders or deposit returns are credited instantly to your Nilara Wallet. Referral bonuses are automatically credited when your referred friend completes their first delivery."
        }
      ];
      await settings.save();
    }

    // Seed deliverySupport if empty
    if (!settings.deliverySupport || !settings.deliverySupport.faqs || settings.deliverySupport.faqs.length === 0) {
      settings.deliverySupport = {
        bannerTitle: 'Partner Support Desk',
        bannerSubtitle: '24x7 Dedicated assistance for delivery issues, payouts, app bugs, and emergency rider safety.',
        statusText: 'Support Live',
        isLive: true,
        helplineNumber: '1800-102-9999',
        helplineTiming: 'Toll Free 24x7',
        supportEmail: 'partner-support@nilara.com',
        emergencyNumber: '1800-102-9999',
        emergencyDescription: 'Immediate on-road safety assistance',
        faqs: [
          {
            question: 'When will my daily delivery earnings be credited?',
            answer: 'Your daily delivery fees, tips, and distance incentives are settled every night at 11:59 PM and automatically credited to your registered primary bank account or UPI ID by the next morning.'
          },
          {
            question: 'What should I do if a customer is unreachable?',
            answer: 'Call the customer using the in-app call button. If the customer does not respond after 3 attempts or 5 minutes, tap "Customer Unreachable" in the order details or raise a quick support ticket to safely return the order to your dark store hub.'
          },
          {
            question: 'How can I update my Vehicle RC or Driving License?',
            answer: 'Go to your Profile tab > Vehicle Information. You can view your registered details and upload a clear photo of your updated Registration Certificate (RC) anytime.'
          },
          {
            question: 'How does the Online / Offline shift toggle work?',
            answer: 'Toggle the shift status on the top right of your home dashboard. When you are "Online", the system automatically assigns nearby orders from your dark store hub. Switch to "Offline" when you wish to take a break.'
          },
          {
            question: 'Do I keep 100% of customer tips?',
            answer: 'Yes! Nilara passes 100% of customer tips directly to delivery partners with zero platform commission. Tips are credited with your daily order settlement.'
          },
          {
            question: 'How are daily incentives and peak bonuses calculated?',
            answer: 'You earn extra bonuses by completing daily milestones (e.g. 15 orders for ₹150 extra, 25 orders for ₹300 extra) during lunch and dinner peak hours. Check the "Incentives & Bonuses" section in the drawer for active schemes.'
          }
        ]
      };
      await settings.save();
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get delivery support settings
// @route   GET /api/v1/settings/delivery-support
// @access  Public
exports.getDeliverySupport = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    if (!settings.deliverySupport || !settings.deliverySupport.faqs || settings.deliverySupport.faqs.length === 0) {
      settings.deliverySupport = {
        bannerTitle: 'Partner Support Desk',
        bannerSubtitle: '24x7 Dedicated assistance for delivery issues, payouts, app bugs, and emergency rider safety.',
        statusText: 'Support Live',
        isLive: true,
        helplineNumber: '1800-102-9999',
        helplineTiming: 'Toll Free 24x7',
        supportEmail: 'partner-support@nilara.com',
        emergencyNumber: '1800-102-9999',
        emergencyDescription: 'Immediate on-road safety assistance',
        faqs: [
          {
            question: 'When will my daily delivery earnings be credited?',
            answer: 'Your daily delivery fees, tips, and distance incentives are settled every night at 11:59 PM and automatically credited to your registered primary bank account or UPI ID by the next morning.'
          },
          {
            question: 'What should I do if a customer is unreachable?',
            answer: 'Call the customer using the in-app call button. If the customer does not respond after 3 attempts or 5 minutes, tap "Customer Unreachable" in the order details or raise a quick support ticket to safely return the order to your dark store hub.'
          },
          {
            question: 'How can I update my Vehicle RC or Driving License?',
            answer: 'Go to your Profile tab > Vehicle Information. You can view your registered details and upload a clear photo of your updated Registration Certificate (RC) anytime.'
          },
          {
            question: 'How does the Online / Offline shift toggle work?',
            answer: 'Toggle the shift status on the top right of your home dashboard. When you are "Online", the system automatically assigns nearby orders from your dark store hub. Switch to "Offline" when you wish to take a break.'
          },
          {
            question: 'Do I keep 100% of customer tips?',
            answer: 'Yes! Nilara passes 100% of customer tips directly to delivery partners with zero platform commission. Tips are credited with your daily order settlement.'
          },
          {
            question: 'How are daily incentives and peak bonuses calculated?',
            answer: 'You earn extra bonuses by completing daily milestones (e.g. 15 orders for ₹150 extra, 25 orders for ₹300 extra) during lunch and dinner peak hours. Check the "Incentives & Bonuses" section in the drawer for active schemes.'
          }
        ]
      };
      await settings.save();
    }

    res.status(200).json({ success: true, data: settings.deliverySupport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update global settings
// @route   PUT /api/v1/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      settings = await Settings.findOneAndUpdate({}, req.body, {
        new: true,
        runValidators: true,
      });
    }

    res.status(200).json({ success: true, data: settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
