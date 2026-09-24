const { auth } = require('../config/firebase');
const User = require('../models/User');

const jwt = require('jsonwebtoken');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        requestId: req.requestId
      });
    }

    const idToken = authHeader.substring(7);
    if (!idToken || idToken.trim().length === 0) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
        requestId: req.requestId
      });
    }

    // 1. Try Custom JWT first
    try {
      const decoded = jwt.verify(idToken, process.env.JWT_SECRET || 'fallback_secret_key_for_dev_only');
      req.auth = {
        userId: decoded.userId,
        role: decoded.role,
        isActive: true,
        permissions: decoded.permissions || []
      };
      return next();
    } catch (jwtError) {
      // Not a valid custom JWT, fallback to Firebase
    }

    // 2. Fallback to Firebase Auth
    let decodedToken;
    try {
      if (!auth) {
        throw new Error('Firebase Admin SDK is not initialized. Please configure FIREBASE_SERVICE_ACCOUNT environment variable on Render.');
      }
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (firebaseError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: firebaseError.message || 'The provided token is expired or invalid' },
        requestId: req.requestId
      });
    }

    const firebaseUid = decodedToken.uid; console.log("Firebase Auth Request:", decodedToken.email, firebaseUid);
    let user = await User.findOne({ firebaseUid });
    if (!user && decodedToken.email) {
      user = await User.findOne({ email: decodedToken.email });
      if (user) {
        user.firebaseUid = firebaseUid;
        await user.save();
      }
    }

    if (!user) {
      req.auth = {
        firebaseUid,
        email: decodedToken.email,
        phone: decodedToken.phone_number,
        picture: decodedToken.picture,
        name: decodedToken.name
      };
      return next();
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended or is inactive.' },
        requestId: req.requestId
      });
    }

    req.auth = {
      firebaseUid: user.firebaseUid,
      userId: user._id.toString(),
      role: user.role,
      isActive: user.isActive,
      permissions: user.permissions || []
    };

    next();
  } catch (error) {
    next(error);
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const idToken = authHeader.substring(7);
    if (!idToken || idToken.trim().length === 0) {
      return next();
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (firebaseError) {
      return next();
    }

    const firebaseUid = decodedToken.uid; console.log("Firebase Auth Request:", decodedToken.email, firebaseUid);
    let user = await User.findOne({ firebaseUid });
    if (!user && decodedToken.email) {
      user = await User.findOne({ email: decodedToken.email });
      if (user) {
        user.firebaseUid = firebaseUid;
        await user.save();
      }
    }

    if (user && user.isActive) {
      req.auth = {
        firebaseUid: user.firebaseUid,
        userId: user._id.toString(),
        role: user.role,
        isActive: user.isActive,
        permissions: user.permissions || []
      };
    } else if (!user) {
      req.auth = {
        firebaseUid,
        email: decodedToken.email,
        phone: decodedToken.phone_number,
        picture: decodedToken.picture,
        name: decodedToken.name
      };
    }
    next();
  } catch (error) {
    next();
  }
};


const requireOnboarding = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.auth.userId);
    
    if (!user || !user.onboardingComplete) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You must complete the onboarding setup first.' },
        requestId: req.requestId
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAuth, optionalAuth, requireOnboarding };

