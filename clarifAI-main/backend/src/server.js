require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const fs = require("fs");
const path = require("path");

const connectDB = require("./config/db");
const logger = require("./utils/logger");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const detectionRoutes = require("./routes/detectionRoutes");
const healthRoutes = require("./routes/healthRoutes");

const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve("uploads");
const logsDir = process.env.LOGS_DIR ? path.resolve(process.env.LOGS_DIR) : path.resolve("logs");
const heatmapDir = path.resolve(process.env.HEATMAP_DIR || "heatmaps");

[uploadDir, logsDir, heatmapDir].forEach((p) => {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// ── Create Express app FIRST, then connect DB ─────────────────────────────
const app = express();

// Connect DB (non-blocking — don't crash the process on failure in dev)
connectDB();

// ── Security headers ───────────────────────────────────────────────────────
app.disable("x-powered-by");
app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
});

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

app.use(
    cors({
        origin: (origin, cb) => {

            if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin ${origin} not allowed`));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (process.env.NODE_ENV !== "test") {
    app.use(
        morgan("combined", {
            stream: { write: (msg) => logger.info(msg.trim()) },
        })
    );
}

app.use(
    rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 30,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: "Too many requests", code: "RATE_LIMITED" },
    })
);

app.use("/api/auth", authRoutes);
app.use("/api/detection", detectionRoutes);
app.use("/health", healthRoutes);

app.use((req, res) =>
    res.status(404).json({ success: false, error: "Route not found", code: "NOT_FOUND" })
);

app.use(errorHandler);

// ── Periodic cleanup: remove orphaned uploads older than 1 hour ───────────
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // every 30 min
const MAX_FILE_AGE_MS = 60 * 60 * 1000; // 1 hour

function cleanupUploads() {
    try {
        const now = Date.now();
        const files = fs.readdirSync(uploadDir);
        let cleaned = 0;
        for (const file of files) {
            const filePath = path.join(uploadDir, file);
            const stat = fs.statSync(filePath);
            if (stat.isFile() && now - stat.mtimeMs > MAX_FILE_AGE_MS) {
                fs.unlinkSync(filePath);
                cleaned++;
            }
        }
        if (cleaned > 0) logger.info(`Upload cleanup: removed ${cleaned} orphaned file(s)`);
    } catch (err) {
        logger.error(`Upload cleanup error: ${err.message}`);
    }
}

const PORT = parseInt(process.env.PORT) || 5000;
if (process.env.NODE_ENV !== "test") {
    app.listen(PORT, () => {
        logger.info(`Server running on http://localhost:${PORT}  [${process.env.NODE_ENV || "development"}]`);
    });
    // Start periodic upload cleanup
    setInterval(cleanupUploads, CLEANUP_INTERVAL_MS);
}

module.exports = app; 