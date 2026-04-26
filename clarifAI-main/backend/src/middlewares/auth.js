const { verifyAccessToken } = require("../services/tokenService");
const User = require("../models/User");
const { unauthorized, forbidden } = require("../utils/apiResponse");
const logger = require("../utils/logger");

/**
 * protect
 * ───────
 * Verify JWT from Authorization: Bearer <token> header.
 * Attaches req.user (Mongoose document) on success.
 */
const protect = async (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        if (!header.startsWith("Bearer ")) {
            return unauthorized(res, "No token provided");
        }

        const token = header.slice(7);
        const decoded = verifyAccessToken(token);

        const user = await User.findById(decoded.id).select("-password -refreshToken");
        if (!user || !user.isActive) {
            return unauthorized(res, "User not found or deactivated");
        }

        req.user = user;
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return unauthorized(res, "Token expired — please refresh", "TOKEN_EXPIRED");
        }
        if (err.name === "JsonWebTokenError") {
            return unauthorized(res, "Invalid token");
        }
        logger.error(`Auth middleware error: ${err.message}`);
        return unauthorized(res, "Authentication failed");
    }
};

/**
 * requireRole
 * ───────────
 * Usage: router.get('/admin', protect, requireRole('admin'), handler)
 */
const requireRole = (...roles) => (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
        return forbidden(res, "You do not have permission to perform this action");
    }
    next();
};

module.exports = { protect, requireRole };