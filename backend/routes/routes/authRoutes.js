const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { login, getMe, seed } = require("../controllers/authController");

// Public
router.post("/login", login);

// Dev seed (remove in production)
router.post("/seed", seed);

// Protected
router.get("/me", auth, getMe);

module.exports = router;