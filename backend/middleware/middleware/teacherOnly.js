module.exports = function(req, res, next) {

  if (req.user.role !== "teacher") {

    return res.status(403).json({
      message: "Access denied. Only teachers can modify marks."
    });

  }

  next();

};