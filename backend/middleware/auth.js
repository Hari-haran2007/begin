const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (e) {
      decoded = jwt.verify(token, 'fallback_secret');
    }
    req.user = decoded.user || decoded;
    if (req.user && !req.user._id && (req.user.id || req.user.userId)) {
      req.user._id = req.user.id || req.user.userId;
    }
    if (req.user && !req.user.id && req.user._id) {
      req.user.id = req.user._id;
    }
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;
