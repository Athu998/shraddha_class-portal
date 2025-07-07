const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: String,
  dob: String,
  school_name: String,
  last_year_marks: String,
  parent_contact: {
    type: String,
    unique: true,
    required: true
  },
  address: String,
  email: {
    type: String,
    unique: true,
    required: true
  },
  password: String,
  className: String // ✅ Fix: use "className" instead of "class" to avoid reserved keyword
});
module.exports = mongoose.model('Student', studentSchema);