const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
  // Accept token as  "Bearer <token>"  or bare token
  const authHeader = req.header("Authorization");
  if (!authHeader) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, department, subjects, name }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};