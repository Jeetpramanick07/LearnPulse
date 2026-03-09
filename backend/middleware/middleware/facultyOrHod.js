// Allows faculty AND hod — blocks students
module.exports = function (req, res, next) {
    if (req.user.role !== "faculty" && req.user.role !== "hod") {
      return res.status(403).json({
        message: "Access denied. Only faculty or HOD can perform this action.",
      });
    }
    next();
  };