const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const facultyOrHod = require("../middleware/facultyOrHod");
const marksController = require("../controllers/marksController");

// All roles can GET (filtered by role inside controller)
router.get("/", auth, marksController.getMarks);

// Only faculty or HOD can write
router.post("/", auth, facultyOrHod, marksController.addMarks);
router.put("/:id", auth, facultyOrHod, marksController.updateMarks);
router.delete("/:id", auth, facultyOrHod, marksController.deleteMarks);

module.exports = router;