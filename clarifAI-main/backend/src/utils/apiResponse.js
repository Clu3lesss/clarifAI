/**
 * Standardised JSON response helpers.
 * Every endpoint should use these so the React frontend always gets the same shape.
 *
 * Success  → { success: true,  data: {},  message: "" }
 * Error    → { success: false, error: "", code: "" }
 */

const success = (res, data = {}, message = "OK", statusCode = 200) =>
    res.status(statusCode).json({ success: true, message, data });

const created = (res, data = {}, message = "Created") =>
    success(res, data, message, 201);

const error = (res, message = "Internal Server Error", statusCode = 500, code = "SERVER_ERROR") =>
    res.status(statusCode).json({ success: false, error: message, code });

const badRequest = (res, message = "Bad request", code = "BAD_REQUEST") =>
    error(res, message, 400, code);

const unauthorized = (res, message = "Unauthorized", code = "UNAUTHORIZED") =>
    error(res, message, 401, code);

const forbidden = (res, message = "Forbidden", code = "FORBIDDEN") =>
    error(res, message, 403, code);

const notFound = (res, message = "Not found", code = "NOT_FOUND") =>
    error(res, message, 404, code);

const tooMany = (res, message = "Too many requests", code = "RATE_LIMITED") =>
    error(res, message, 429, code);

module.exports = { success, created, error, badRequest, unauthorized, forbidden, notFound, tooMany };