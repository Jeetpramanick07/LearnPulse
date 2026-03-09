// Allows only hod
module.exports = function (req, res, next) {
    if (req.user.role !== "hod") {
      return res.status(403).json({
        message: "Access denied. Only HOD can perform this action.",
      });
    }
    next();
  };