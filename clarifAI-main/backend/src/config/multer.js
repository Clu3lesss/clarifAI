const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const MAX_SIZE = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.resolve(process.env.UPLOAD_DIR || "uploads");
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${uuidv4()}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(
            Object.assign(new Error("Only JPEG, PNG and WebP images are allowed."), {
                code: "INVALID_FILE_TYPE",
                status: 415,
            }),
            false
        );
    }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

module.exports = upload;