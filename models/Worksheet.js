const mongoose = require('mongoose');

const worksheetSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    file: {
        type: String, // store filename of uploaded PDF
        required: true
    },
    uploaded_at: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Worksheet', worksheetSchema);
