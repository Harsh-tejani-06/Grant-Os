/**
 * middleware/internalScraperAuth.js
 *
 * Authenticates machine-to-machine calls from the Python scraper to the
 * internal grant-ingest endpoint.  Uses a simple shared-secret bearer
 * token (INTERNAL_SCRAPER_TOKEN) rather than the JWT flow used by
 * user-facing routes — this keeps the scraper decoupled from the User
 * model entirely.
 *
 * The token is never committed to source control; it lives in .env only.
 */

const verifyScraperToken = (req, res, next) => {
  const expectedToken = process.env.INTERNAL_SCRAPER_TOKEN;

  if (!expectedToken) {
    console.error('INTERNAL_SCRAPER_TOKEN is not set in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Server misconfiguration — scraper token not set',
    });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or malformed Authorization header',
    });
  }

  const token = authHeader.split(' ')[1];

  if (token !== expectedToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid scraper token',
    });
  }

  next();
};

module.exports = { verifyScraperToken };
