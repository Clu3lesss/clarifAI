const router = require("express").Router();
const upload = require("../config/multer");
const { predict, getResult, getHistory } = require("../controllers/detectionController");
const { protect } = require("../middlewares/auth");

// All detection routes require authentication
router.use(protect);

/**
 * API 1 — POST /api/detection/predict
 * Body: multipart/form-data  { file: <image> }
 * Calls ML service → returns full result + heatmap
 */
router.post("/predict", upload.single("file"), predict);

/**
 * API 2 — GET /api/detection/result/:id
 * Returns stored detection result including Grad-CAM heatmap (base64)
 */
router.get("/result/:id", getResult);

/**
 * GET /api/detection/history
 * Paginated list of past detections (heatmaps excluded)
 * Query: ?page=1&limit=10
 */
router.get("/history", getHistory);

module.exports = router;