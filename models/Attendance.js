const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  status: { type: String, enum: ['Present', 'Absent'], required: true },
  date: { type: String, required: true } 
});

module.exports = mongoose.model('Attendance', attendanceSchema);
