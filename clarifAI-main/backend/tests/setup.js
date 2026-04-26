const os = require("os");

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "7d8c76e87f41c2172c0322520834cd10d0e8f87ac98cd5839b353704a0731292";
process.env.JWT_REFRESH_SECRET = "8ca23b20e2a40fc091ec00f0e257845f88d7698f70ca3f06c32256504566f059";
process.env.JWT_EXPIRES_IN = "1h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
// ALWAYS override MONGO_URI to prevent tests from accidentally running against production.
// For CI/CD, set MONGO_TEST_URI in your environment.
process.env.MONGO_URI = process.env.MONGO_TEST_URI || "mongodb://localhost:27017/deepfake_test";
process.env.ML_SERVICE_URL = "http://localhost:8000";
// Use the OS temp dir so tests pass on both Windows and Linux/macOS
process.env.UPLOAD_DIR = os.tmpdir();
process.env.MAX_FILE_SIZE_MB = "10";
process.env.ALLOWED_ORIGINS = "http://localhost:3000";
process.env.RATE_LIMIT_MAX = "1000";