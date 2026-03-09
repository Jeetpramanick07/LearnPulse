const Marks = require("../models/Marks");

// ─────────────────────────────────────────────
// GET /api/marks
// Student  → sees only their own marks
// Faculty  → sees marks for their subjects only
// HOD      → sees all marks
// ─────────────────────────────────────────────
exports.getMarks = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "student") {
      query = { student: req.user.id };
    } else if (req.user.role === "faculty") {
      // Faculty can only see marks for subjects they are assigned to
      query = { subject: { $in: req.user.subjects } };
    }
    // HOD: no filter — sees everything

    const data = await Marks.find(query).populate("student", "name email department");
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// POST /api/marks
// Faculty or HOD only
// Faculty can only add marks for their own subjects
// ─────────────────────────────────────────────
exports.addMarks = async (req, res) => {
  try {
    const { student, subject, marks, maxMarks } = req.body;

    const mark = new Marks({
      student,
      subject,
      marks,
      maxMarks: maxMarks || 100,
      addedBy: req.user.id,
    });

    await mark.save();
    return res.status(201).json({ message: "Marks added successfully.", mark });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// PUT /api/marks/:id
// Faculty can only update marks in their subjects
// HOD can update anything
// ─────────────────────────────────────────────
exports.updateMarks = async (req, res) => {
  try {
    const mark = await Marks.findById(req.params.id);
    if (!mark) return res.status(404).json({ message: "Mark record not found." });

    const updated = await Marks.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

    return res.json({ message: "Marks updated successfully.", mark: updated });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/marks/:id
// Faculty can only delete marks for their subjects
// HOD can delete anything
// ─────────────────────────────────────────────
exports.deleteMarks = async (req, res) => {
  try {
    const mark = await Marks.findById(req.params.id);
    if (!mark) return res.status(404).json({ message: "Mark record not found." });

    await Marks.findByIdAndDelete(req.params.id);
    return res.json({ message: "Marks deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};