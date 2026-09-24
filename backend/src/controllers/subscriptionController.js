const Subscription = require('../models/Subscription');

const Settings = require('../models/Settings');

exports.createSubscription = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const {
      planName,
      frequency,
      productName,
      quantity,
      price,
      discountedPrice,
      deliveryTime,
      startDate,
      address,
      paymentMethod,
      specialInstructions
    } = req.body;

    const start = startDate ? new Date(startDate) : new Date();
    
    // Fetch settings to get durationMonths for the selected plan
    const settings = await Settings.findOne();
    let durationMonths = 1;
    if (settings && settings.subscriptionPlans) {
      const plan = settings.subscriptionPlans.find(p => p.name === planName);
      if (plan && plan.durationMonths) {
        durationMonths = plan.durationMonths;
      }
    }

    const end = new Date(start);
    end.setDate(end.getDate() + (durationMonths * 30));

    const subscription = new Subscription({
      user: userId,
      planName,
      frequency,
      productName,
      quantity: quantity || 1,
      price,
      discountedPrice,
      deliveryTime,
      startDate: start,
      endDate: end,
      address,
      paymentMethod,
      specialInstructions,
      status: 'Active'
    });

    await subscription.save();

    res.status(201).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

exports.updateMySubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['Active', 'Suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Can only be Active or Suspended.' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, user: req.auth.userId },
      { status },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found or unauthorized' });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error updating my subscription status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMySubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ user: req.auth.userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .populate('user', 'displayName phone email')
      .populate('deliveryPartner', 'displayName phone deliveryDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.skipNextDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findOne({ _id: id, user: req.auth.userId });

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found or unauthorized' });
    }

    const { date, dateRange, removeDate } = req.body;
    let action = '';

    if (!subscription.skippedDeliveries) subscription.skippedDeliveries = [];

    if (removeDate) {
      const target = new Date(removeDate);
      target.setHours(0, 0, 0, 0);
      subscription.skippedDeliveries = subscription.skippedDeliveries.filter(d => {
        const sd = new Date(d);
        sd.setHours(0, 0, 0, 0);
        return sd.getTime() !== target.getTime();
      });
      action = 'removed';
    } else if (dateRange && Array.isArray(dateRange) && dateRange.length === 2) {
      const start = new Date(dateRange[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange[1]);
      end.setHours(0, 0, 0, 0);

      let current = new Date(start);
      while (current <= end) {
        const exists = subscription.skippedDeliveries.some(d => {
          const sd = new Date(d);
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === current.getTime();
        });
        if (!exists) {
          subscription.skippedDeliveries.push(new Date(current));
        }
        current.setDate(current.getDate() + 1);
      }
      action = 'skipped_range';
    } else {
      const targetDate = date ? new Date(date) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      const isSkipped = subscription.skippedDeliveries.some(d => {
        const sd = new Date(d);
        sd.setHours(0, 0, 0, 0);
        return sd.getTime() === targetDate.getTime();
      });

      if (isSkipped) {
        subscription.skippedDeliveries = subscription.skippedDeliveries.filter(d => {
          const sd = new Date(d);
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() !== targetDate.getTime();
        });
        action = 'removed';
      } else {
        subscription.skippedDeliveries.push(targetDate);
        action = 'skipped';
      }
    }

    await subscription.save();

    res.status(200).json({ success: true, data: subscription, action });
  } catch (error) {
    console.error('Error skipping delivery:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.rescheduleDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryTime } = req.body;

    if (!deliveryTime) {
      return res.status(400).json({ success: false, message: 'deliveryTime is required' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, user: req.auth.userId },
      { deliveryTime },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found or unauthorized' });
    }

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error rescheduling delivery:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateSubscriptionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Suspended', 'Cancelled', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate('user', 'displayName phone email');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error updating subscription status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryTime, leaveAtDoor, callBeforeDelivery, specialInstructions } = req.body;

    const updates = {};
    if (deliveryTime !== undefined) updates.deliveryTime = deliveryTime;
    if (leaveAtDoor !== undefined) updates.leaveAtDoor = leaveAtDoor;
    if (callBeforeDelivery !== undefined) updates.callBeforeDelivery = callBeforeDelivery;
    if (specialInstructions !== undefined) updates.specialInstructions = specialInstructions;

    const subscription = await Subscription.findOneAndUpdate(
      { _id: id, user: req.auth.userId },
      { $set: updates },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found or unauthorized' });
    }

    res.status(200).json({ success: true, data: subscription });
  } catch (error) {
    console.error('Error updating subscription preferences:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.assignDeliveryPartner = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryPartnerId } = req.body;

    const update = deliveryPartnerId ? { deliveryPartner: deliveryPartnerId } : { $unset: { deliveryPartner: 1 } };

    const subscription = await Subscription.findByIdAndUpdate(
      id,
      update,
      { new: true }
    )
      .populate('user', 'displayName phone email')
      .populate('deliveryPartner', 'displayName phone deliveryDetails');

    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    // Emit real-time updates via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('subscription_updated', subscription);
      io.to('delivery_room').emit('subscription_assignment_updated', {
        subscriptionId: subscription._id,
        deliveryPartnerId: deliveryPartnerId || null
      });

      if (deliveryPartnerId) {
        io.to(`user_${deliveryPartnerId}`).emit('new_daily_delivery_assigned', {
          subscriptionId: subscription._id,
          customerName: subscription.user?.displayName || 'Subscriber',
          planName: subscription.planName,
          productName: subscription.productName,
          quantity: subscription.quantity,
          frequency: subscription.frequency,
          deliveryTime: subscription.deliveryTime,
          address: subscription.address
        });
      }
    }

    res.status(200).json({
      success: true,
      message: deliveryPartnerId ? 'Delivery partner assigned successfully' : 'Delivery partner unassigned',
      data: subscription
    });
  } catch (error) {
    console.error('Error assigning delivery partner:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

