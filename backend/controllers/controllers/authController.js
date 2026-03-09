const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password, role }
//   role must match what was assigned in DB.
//   If a student tries to log in as faculty → 403.
// ─────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Validate all fields present
    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Email, password and role are required.",
      });
    }

    // 2. Role must be one of the valid options
    const validRoles = ["student", "faculty", "hod"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role selected." });
    }

    // 3. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 4. *** KEY CHECK: role selected on login must match role in DB ***
    if (user.role !== role) {
      return res.status(403).json({
        message: `Access denied. You are not registered as ${role}.`,
      });
    }

    // 5. Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // 6. Sign JWT — embed role, dept, subjects in payload
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        department: user.department,
        subjects: user.subjects,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        subjects: user.subjects,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me  (protected)
// Returns logged-in user info from token
// ─────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found." });
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: "Server error." });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/seed  (dev only — remove in production)
// Creates HOD/faculty/student accounts for testing
// ─────────────────────────────────────────────
exports.seed = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Seed disabled in production." });
    }

    const users = [
      {
        name: "Dr. Head Of Dept",
        email: "hod@college.edu",
        password: "hod123",
        role: "hod",
        department: "Computer Science",
        subjects: [],
      },
      {
        name: "Prof. John Smith",
        email: "faculty@college.edu",
        password: "faculty123",
        role: "faculty",
        department: "Computer Science",
        subjects: ["Mathematics", "Data Structures"],
      },
      {
        name: "Alice Student",
        email: "student@college.edu",
        password: "student123",
        role: "student",
        department: "Computer Science",
        subjects: [],
      },
    ];

    for (const u of users) {
      const exists = await User.findOne({ email: u.email });
      if (!exists) await User.create(u);
    }

    return res.json({ message: "Seed complete. Check /api/auth/login." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};