const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const teacherOnly = require("../middleware/teacherOnly");

const marksController = require("../controllers/marksController");


// STUDENT + TEACHER
router.get(
  "/",
  auth,
  marksController.getMarks
);


// TEACHER ONLY
router.post(
  "/",
  auth,
  teacherOnly,
  marksController.addMarks
);


// TEACHER ONLY
router.put(
  "/:id",
  auth,
  teacherOnly,
  marksController.updateMarks
);


// TEACHER ONLY
router.delete(
  "/:id",
  auth,
  teacherOnly,
  marksController.deleteMarks
);


module.exports = router;