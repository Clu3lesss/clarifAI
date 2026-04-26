const router = require("express").Router();
const { checkHealth } = require("../services/mlService");
const { success } = require("../utils/apiResponse");
const mongoose = require("mongoose");
const Detection = require("../models/Detection");

router.get("/", async (req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    const mlOnline = await checkHealth();

    res.status(mlOnline && dbState === "connected" ? 200 : 503).json({
        success: true,
        status: mlOnline && dbState === "connected" ? "ok" : "degraded",
        services: {
            api: "ok",
            database: dbState,
            mlService: mlOnline ? "ok" : "unavailable",
        },
        timestamp: new Date().toISOString(),
    });
});

/**
 * GET /health/stats — public stats for the landing page.
 * Returns total detections, fakes flagged, and average processing time.
 */
router.get("/stats", async (req, res) => {
    try {
        const [totalResult, fakeResult, avgTimeResult] = await Promise.all([
            Detection.countDocuments({ status: "completed" }),
            Detection.countDocuments({ status: "completed", label: "FAKE" }),
            Detection.aggregate([
                { $match: { status: "completed", processingTimeMs: { $gt: 0 } } },
                { $group: { _id: null, avgMs: { $avg: "$processingTimeMs" } } },
            ]),
        ]);

        const avgMs = avgTimeResult[0]?.avgMs ?? 0;

        return success(res, {
            totalDetections: totalResult,
            fakesFlagged: fakeResult,
            avgDetectionTimeSec: +(avgMs / 1000).toFixed(1),
        });
    } catch {
        return success(res, {
            totalDetections: 0,
            fakesFlagged: 0,
            avgDetectionTimeSec: 0,
        });
    }
});

module.exports = router;