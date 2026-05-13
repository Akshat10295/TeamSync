const rateLimitMap = new Map();
function rateLimit(windowMs = 60000, maxAttempts = 10) {
  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();
    if (!rateLimitMap.has(key)) rateLimitMap.set(key, []);
    const attempts = rateLimitMap.get(key).filter(t => now - t < windowMs);
    if (attempts.length >= maxAttempts) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    attempts.push(now);
    rateLimitMap.set(key, attempts);
    next();
  };
}
module.exports = { rateLimit };
