/**
 * mlService.js
 * ─────────────
 * Bridges the Node.js backend to the Python FastAPI deepfake detection service.
 *
 * It reads the image from disk, POSTs it to /detect as multipart/form-data,
 * and returns the structured ML result.
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");
const logger = require("../utils/logger");

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_API_KEY = process.env.ML_API_KEY || "";

/**
 * Run deepfake detection on a local file path.
 *
 * @param {string} filePath   Absolute path to the image on disk
 * @param {string} mimeType   MIME type of the image (image/jpeg etc.)
 * @returns {Promise<MLResult>}
 */
const runDetection = async (filePath, mimeType) => {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), {
        filename: path.basename(filePath),
        contentType: mimeType,
    });

    try {
        logger.debug(`Calling ML service: POST ${ML_URL}/detect`);

        const headers = { ...form.getHeaders() };
        if (ML_API_KEY) headers["X-API-Key"] = ML_API_KEY;

        const response = await axios.post(`${ML_URL}/detect`, form, {
            headers,
            timeout: 60_000,           // 60-second timeout for GPU inference
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
        });

        /** @type {MLResult} */
        const result = response.data;
        logger.info(
            `ML result: label=${result.label} score=${result.score} risk=${result.risk_level}`
        );
        return result;
    } catch (err) {
        if (err.response) {
            // ML service returned an HTTP error
            const msg = err.response.data?.detail || err.response.statusText;
            logger.error(`ML service error ${err.response.status}: ${msg}`);
            const e = new Error(`ML service error: ${msg}`);
            e.mlStatus = err.response.status;
            throw e;
        }
        // Network / timeout
        logger.error(`ML service unreachable: ${err.message}`);
        const e = new Error("ML service is currently unavailable. Please try again later.");
        e.mlStatus = 503;
        throw e;
    }
};

/**
 * Health-check the ML service.
 * @returns {Promise<boolean>}
 */
const checkHealth = async () => {
    try {
        const res = await axios.get(`${ML_URL}/health`, { timeout: 5_000 });
        return res.data?.status === "ok";
    } catch {
        return false;
    }
};

/**
 * @typedef {Object} MLResult
 * @property {number}  score            P(fake) × 100, range 0–100
 * @property {string}  label            "REAL" | "FAKE"
 * @property {number}  confidence       0–100
 * @property {string}  heatmap_b64      base64-encoded PNG (Grad-CAM overlay)
 * @property {boolean} face_detected    false = full-image fallback was used
 * @property {string}  risk_level       "Real" | "Uncertain" | "Likely Fake"
 * @property {number}  processing_time_ms
 */

module.exports = { runDetection, checkHealth };