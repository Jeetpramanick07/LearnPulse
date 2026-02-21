const Marks = require("../models/Marks");


// TEACHER ONLY
exports.addMarks = async (req, res) => {

  try {

    const marks = new Marks({
      student: req.body.student,
      subject: req.body.subject,
      marks: req.body.marks
    });

    await marks.save();

    res.json({
      message: "Marks added successfully"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


// STUDENT + TEACHER
exports.getMarks = async (req, res) => {

  try {

    let data;

    if (req.user.role === "student") {

      data = await Marks.find({
        student: req.user.id
      }).populate("student", "name email");

    } else {

      data = await Marks.find()
        .populate("student", "name email");

    }

    res.json(data);

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


// TEACHER ONLY
exports.updateMarks = async (req, res) => {

  try {

    await Marks.findByIdAndUpdate(
      req.params.id,
      req.body
    );

    res.json({
      message: "Marks updated successfully"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};


// TEACHER ONLY
exports.deleteMarks = async (req, res) => {

  try {

    await Marks.findByIdAndDelete(req.params.id);

    res.json({
      message: "Marks deleted successfully"
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

};