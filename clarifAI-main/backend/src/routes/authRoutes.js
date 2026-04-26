const router = require("express").Router();
const { body } = require("express-validator");
const { register, login, refresh, logout, me } = require("../controllers/authController");
const { protect } = require("../middlewares/auth");

// Validation rules
const registerRules = [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 60 }),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password")
        .isLength({ min: 8 }).withMessage("Password must be ≥ 8 characters")
        .matches(/[A-Z]/).withMessage("Must contain an uppercase letter")
        .matches(/[0-9]/).withMessage("Must contain a number"),
];

const loginRules = [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
];

router.post("/register", registerRules, register);
router.post("/login", loginRules, login);
router.post("/refresh", refresh);
router.post("/logout", protect, logout);
router.get("/me", protect, me);

module.exports = router;