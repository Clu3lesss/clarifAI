const logger = require("../utils/logger");
const { error } = require("../utils/apiResponse");

/**
 * Global Express error handler.
 * Must be registered LAST with app.use(errorHandler).
 */
const errorHandler = (err, req, res, next) => {

    // Multer errors
    if (err.code === "LIMIT_FILE_SIZE") {
        return error(res, `File exceeds ${process.env.MAX_FILE_SIZE_MB || 10} MB limit`, 413, "FILE_TOO_LARGE");
    }
    if (err.code === "INVALID_FILE_TYPE" || err.status === 415) {
        return error(res, err.message, 415, "INVALID_FILE_TYPE");
    }

    // Mongoose validation
    if (err.name === "ValidationError") {
        const msg = Object.values(err.errors).map((e) => e.message).join(", ");
        return error(res, msg, 400, "VALIDATION_ERROR");
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return error(res, `${field} already in use`, 409, "DUPLICATE_FIELD");
    }

    // ML service errors
    if (err.mlStatus) {
        return error(res, err.message, err.mlStatus, "ML_SERVICE_ERROR");
    }

    logger.error(`Unhandled error: ${err.stack || err.message}`);
    return error(res, "Something went wrong. Please try again.", 500);
};

module.exports = errorHandler;