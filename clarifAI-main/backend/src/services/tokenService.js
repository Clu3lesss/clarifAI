const jwt = require("jsonwebtoken");

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

/**
 * Generate a short-lived access token.
 */
const generateAccessToken = (payload) =>
    jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });

/**
 * Generate a long-lived refresh token.
 */
const generateRefreshToken = (payload) =>
    jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

/**
 * Verify an access token. Throws if invalid/expired.
 */
const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);

/**
 * Verify a refresh token. Throws if invalid/expired.
 */
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

/**
 * Generate both tokens for a user document.
 */
const generateTokenPair = (user) => {
    const payload = { id: user._id, role: user.role };
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
    };
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
};