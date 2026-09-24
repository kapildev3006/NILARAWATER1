const User = require('../models/User');

const syncUser = async (req, res, next) => {
  try {
    // req.auth is populated by authMiddleware and guaranteed to exist here
    const { firebaseUid, email, phone, picture, name, userId } = req.auth;

    let user;

    if (userId) {
      // User already exists and was found by authMiddleware
      user = await User.findById(userId);
    } else {
      // Idempotent creation for first-time login
      try {
        user = await User.findOneAndUpdate(
          { firebaseUid },
          {
            $setOnInsert: {
              firebaseUid,
              email: email || undefined,
              phone: phone || undefined,
              displayName: name || undefined,
              photoUrl: picture || undefined,
              role: 'customer',
              isActive: true,
            }
          },
          { new: true, upsert: true, runValidators: true }
        );
      } catch (err) {
        // Handle potential race condition on unique index creation
        if (err.code === 11000) {
          user = await User.findOne({ firebaseUid });
        } else {
          throw err;
        }
      }
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account has been suspended.'
        },
        requestId: req.requestId
      });
    }

    // Capitalize vehicle and license numbers in deliveryDetails
    let sanitizedDeliveryDetails = user.deliveryDetails;
    if (sanitizedDeliveryDetails) {
      sanitizedDeliveryDetails = typeof sanitizedDeliveryDetails.toObject === 'function' 
        ? sanitizedDeliveryDetails.toObject() 
        : { ...sanitizedDeliveryDetails };
      if (sanitizedDeliveryDetails.vehicleNumber) {
        sanitizedDeliveryDetails.vehicleNumber = sanitizedDeliveryDetails.vehicleNumber.toString().toUpperCase();
      }
      if (sanitizedDeliveryDetails.drivingLicenseNumber) {
        sanitizedDeliveryDetails.drivingLicenseNumber = sanitizedDeliveryDetails.drivingLicenseNumber.toString().toUpperCase();
      }
    }

    // Sanitize user before returning
    const safeUser = {
      id: user._id,
      email: user.email,
      phone: user.phone,
      displayName: user.displayName,
      role: user.role,
      photoUrl: user.photoUrl,
      isActive: user.isActive,
      onboardingComplete: user.onboardingComplete || false,
      deliveryDetails: sanitizedDeliveryDetails,
      dob: user.dob,
      address: user.address,
      emergencyContact: user.emergencyContact,
      createdAt: user.createdAt
    };

    res.status(200).json({
      success: true,
      data: safeUser,
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Email and password are required' }
      });
    }

    const trimmedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail, role: 'admin' });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No admin account found with this email address' }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'This admin account is suspended or inactive' }
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Incorrect password. Please try again.' }
      });
    }

    const tokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: user.displayName,
      permissions: user.permissions
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only',
      { expiresIn: '24h' }
    );

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

const validateAdminSession = async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        requestId: req.requestId
      });
    }

    const user = await User.findById(req.auth.userId).select('-password -__v');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Admin account not found' },
        requestId: req.requestId
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied: Admin privileges required' },
        requestId: req.requestId
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'This admin account is suspended or inactive' },
        requestId: req.requestId
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        photoUrl: user.photoUrl
      },
      requestId: req.requestId
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  syncUser,
  adminLogin,
  validateAdminSession
};
