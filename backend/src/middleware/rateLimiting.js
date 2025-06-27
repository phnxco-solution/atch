const { RateLimiterMemory } = require('rate-limiter-flexible');

// Rate limiter for general API endpoints
const apiLimiter = new RateLimiterMemory({
  keyPrefix: 'api',
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 || 900, // Per 15 minutes (900 seconds)
});

// Stricter rate limiter for authentication endpoints
const authLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 5, // Number of attempts
  duration: 60 * 15, // Per 15 minutes
  blockDuration: 60 * 15, // Block for 15 minutes if limit exceeded
});

// Rate limiter for message sending
const messageLimiter = new RateLimiterMemory({
  keyPrefix: 'message',
  points: 60, // Number of messages
  duration: 60, // Per minute
});

const createRateLimitMiddleware = (limiter, message = 'Too many requests') => {
  return async (req, res, next) => {
    try {
      const key = req.ip || req.connection.remoteAddress;
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      
      return res.status(429).json({
        success: false,
        message: message,
        retryAfter: secs
      });
    }
  };
};

const createUserRateLimitMiddleware = (limiter, message = 'Too many requests') => {
  return async (req, res, next) => {
    try {
      // Use user ID if authenticated, otherwise fall back to IP
      const key = req.user ? `user_${req.user.id}` : req.ip;
      await limiter.consume(key);
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.set('Retry-After', String(secs));
      
      return res.status(429).json({
        success: false,
        message: message,
        retryAfter: secs
      });
    }
  };
};

module.exports = {
  apiRateLimit: createRateLimitMiddleware(apiLimiter),
  authRateLimit: createRateLimitMiddleware(authLimiter, 'Too many authentication attempts'),
  messageRateLimit: createUserRateLimitMiddleware(messageLimiter, 'Too many messages sent'),
  rateLimiters: {
    apiLimiter,
    authLimiter,
    messageLimiter
  }
};
