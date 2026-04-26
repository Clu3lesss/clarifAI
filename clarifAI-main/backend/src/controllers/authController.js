const { validationResult } = require("express-validator");
const User = require("../models/User");
const { generateTokenPair, verifyRefreshToken } = require("../services/tokenService");
const { success, created, badRequest, unauthorized, error } = require("../utils/apiResponse");
const logger = require("../utils/logger");

exports.register = async (req, res, next) => {
    try {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            return badRequest(res, errs.array().map((e) => e.msg).join(", "));
        }

        const { name, email, password } = req.body;

        const existing = await User.findOne({ email });
        if (existing) {
            return badRequest(res, "Email already registered", "EMAIL_TAKEN");
        }

        const user = await User.create({ name, email, password });
        const { accessToken, refreshToken } = generateTokenPair(user);

        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        logger.info(`New user registered: ${email}`);
        return created(res, { user: user.toSafeObject(), accessToken, refreshToken }, "Account created");
    } catch (err) {
        next(err);
    }
};

exports.login = async (req, res, next) => {
    try {
        const errs = validationResult(req);
        if (!errs.isEmpty()) {
            return badRequest(res, errs.array().map((e) => e.msg).join(", "));
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            return unauthorized(res, "Invalid email or password", "INVALID_CREDENTIALS");
        }

        if (!user.isActive) {
            return unauthorized(res, "Account deactivated. Contact support.", "ACCOUNT_INACTIVE");
        }

        const { accessToken, refreshToken } = generateTokenPair(user);
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save({ validateBeforeSave: false });

        logger.info(`User logged in: ${email}`);
        return success(res, { user: user.toSafeObject(), accessToken, refreshToken }, "Login successful");
    } catch (err) {
        next(err);
    }
};

exports.refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return badRequest(res, "Refresh token required");

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            return unauthorized(res, "Invalid or expired refresh token", "REFRESH_TOKEN_INVALID");
        }

        // Atomic: only update if the stored refresh token still matches the one the client sent.
        // This prevents a race condition when multiple tabs try to refresh simultaneously.
        const tokens = generateTokenPair({ _id: decoded.id, role: decoded.role });
        const user = await User.findOneAndUpdate(
            { _id: decoded.id, refreshToken },
            { refreshToken: tokens.refreshToken },
            { new: true }
        ).select("+refreshToken");

        if (!user) {
            return unauthorized(res, "Refresh token mismatch or already used", "REFRESH_TOKEN_INVALID");
        }

        return success(res, tokens, "Tokens refreshed");
    } catch (err) {
        next(err);
    }
};

exports.logout = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
        return success(res, {}, "Logged out successfully");
    } catch (err) {
        next(err);
    }
};

exports.me = async (req, res) =>
    success(res, { user: req.user.toSafeObject() }, "User profile");