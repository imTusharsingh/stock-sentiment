const authService = require("../services/authService");

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers.authorization;

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);

    req.user = user;
    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

// Middleware for GraphQL context
const graphqlAuthContext = async ({ req }) => {
  try {
    const token =
      req.headers.authorization?.replace("Bearer ", "") ||
      req.headers.authorization;

    if (!token) {
      return { user: null };
    }

    const decoded = authService.verifyToken(token);
    const user = await authService.getUserById(decoded.userId);

    return { user };
  } catch (error) {
    return { user: null };
  }
};

// Middleware to require authentication
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

module.exports = {
  authMiddleware,
  graphqlAuthContext,
  requireAuth,
};
