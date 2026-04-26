const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Detection = require("../models/Detection");
const User = require("../models/User");
const { runDetection } = require("../services/mlService");
const { success, error, notFound, badRequest } = require("../utils/apiResponse");
const logger = require("../utils/logger");

// Add this right after heatmapDir is defined (line 10)
const heatmapDir = path.resolve(process.env.HEATMAP_DIR || "heatmaps");

if (!fs.existsSync(heatmapDir)) {
    fs.mkdirSync(heatmapDir, { recursive: true });
}
/**
 * Save a base64 heatmap to disk and return the filename.
 */
function saveHeatmap(detectionId, b64) {
    if (!b64) return null;
    try {
        const filename = `${detectionId}.png`;
        const filePath = path.join(heatmapDir, filename);
        fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
        return filename;
    } catch (err) {
        console.error(`[ERROR] saveHeatmap failed for ${detectionId}:`, err.message);
        return null;
    }
}
/**
 * Read a heatmap from disk and return its base64 string.
 */
function readHeatmap(filename) {
    if (!filename) return null;
    const filePath = path.join(heatmapDir, filename);
    try {
        return fs.readFileSync(filePath).toString("base64");
    } catch {
        return null;
    }
}

/**
 * Validate that a string is a valid MongoDB ObjectId.
 */
function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id) && new mongoose.Types.ObjectId(id).toString() === id;
}

exports.predict = async (req, res, next) => {
    const file = req.file;
    if (!file) return badRequest(res, "Image file is required", "NO_FILE");

    let detection;
    try {
        detection = await Detection.create({
            user: req.user._id,
            filename: file.filename,
            originalName: file.originalname,
            fileSizeBytes: file.size,
            mimeType: file.mimetype,
            score: 0,
            label: "REAL",
            confidence: 0,
            riskLevel: "Real",
            status: "pending",
        });
    } catch (err) {
        return next(err);
    }

    try {
        const mlResult = await runDetection(file.path, file.mimetype);

        // Save heatmap to disk instead of MongoDB (#19)
        const heatmapFile = saveHeatmap(detection._id.toString(), mlResult.heatmap_b64);

        detection.score = mlResult.score;
        detection.label = mlResult.label;
        detection.confidence = mlResult.confidence;
        detection.riskLevel = mlResult.risk_level;
        detection.faceDetected = mlResult.face_detected;
        detection.heatmapFile = heatmapFile;
        detection.processingTimeMs = mlResult.processing_time_ms;
        detection.status = "completed";
        await detection.save();

        await User.findByIdAndUpdate(req.user._id, { $inc: { detectionCount: 1 } });

        logger.info(`Detection ${detection._id} complete | user=${req.user.email} | label=${mlResult.label}`);

        return success(
            res,
            {
                detectionId: detection._id,
                score: mlResult.score,
                label: mlResult.label,
                confidence: mlResult.confidence,
                riskLevel: mlResult.risk_level,
                faceDetected: mlResult.face_detected,
                heatmapB64: mlResult.heatmap_b64,
                processingTimeMs: mlResult.processing_time_ms,
                warnings: mlResult.face_detected ? [] : ["No face detected — full image analysed"],
            },
            "Detection complete"
        );
    } catch (err) {
        if (detection?._id) {
            await Detection.findByIdAndUpdate(detection._id, {
                status: "failed",
                errorMessage: err.message,
            }).catch(() => { });
        }
        next(err);
    } finally {
        // Clean up the uploaded file (single place — removed from errorHandler to avoid double-delete)
        if (file?.path) {
            fs.unlink(file.path, () => { });
        }
    }
};

exports.getResult = async (req, res, next) => {
    try {
        // Validate ObjectId to avoid CastError (#20)
        if (!isValidObjectId(req.params.id)) {
            return notFound(res, "Detection not found");
        }

        const detection = await Detection.findById(req.params.id).populate(
            "user", "name email"
        );

        if (!detection) return notFound(res, "Detection not found");

        if (
            detection.user._id.toString() !== req.user._id.toString() &&
            req.user.role !== "admin"
        ) {
            return notFound(res, "Detection not found");
        }

        // Read heatmap from disk
        const heatmapB64 = readHeatmap(detection.heatmapFile);

        return success(res, {
            id: detection._id,
            status: detection.status,
            originalName: detection.originalName,
            fileSizeBytes: detection.fileSizeBytes,
            score: detection.score,
            label: detection.label,
            confidence: detection.confidence,
            riskLevel: detection.riskLevel,
            faceDetected: detection.faceDetected,
            heatmapB64,
            processingTimeMs: detection.processingTimeMs,
            warnings: detection.faceDetected ? [] : ["No face detected — full image analysed"],
            createdAt: detection.createdAt,
            user: {
                name: detection.user.name,
                email: detection.user.email,
            },
        });
    } catch (err) {
        next(err);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const query = req.user.role === "admin" ? {} : { user: req.user._id };
        const [detections, total] = await Promise.all([
            Detection.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("-heatmapFile")
                .lean(),
            Detection.countDocuments(query),
        ]);

        return success(res, {
            detections,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        next(err);
    }
};