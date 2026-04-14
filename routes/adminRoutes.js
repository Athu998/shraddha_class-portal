const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');

const Worksheet = require('../models/Worksheet');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');

// =======================
// 📧 EMAIL CONFIG (FIXED)
// =======================
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "trycoding06@gmail.com",
    pass: "fcusbcnwonkartjg"
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify connection once at start
transporter.verify()
  .then(() => console.log("✅ SMTP Connected"))
  .catch(err => console.error("❌ SMTP Error:", err));

// =======================
// 📧 SEND EMAIL FUNCTION
// =======================
async function sendAttendanceEmail(studentId, status, date) {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.email) return;

    const mailOptions = {
      from: "trycoding06@gmail.com",
      to: student.email,
      subject: "Attendance Notification",
      text: `Hello ${student.name},

Your attendance for ${date} is marked as: ${status}.

Shraddha Coaching Classes
Developed by Atharva`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${student.email}`);

  } catch (err) {
    console.error(`❌ Email failed for ${studentId}:`, err.message);
  }
}

// =======================
// 📁 STATIC FILES
// =======================
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// =======================
// 📂 MULTER SETUP
// =======================
const uploadsDir = path.join(__dirname, '../public/uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// =======================
// 🔐 LOGIN ROUTES
// =======================
router.get('/admin-login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.send("❌ Admin not found");

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.send("❌ Incorrect password");

    req.session.admin = { id: admin._id, username: admin.username };
    res.redirect('/admin/dashboard');

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// =======================
// 📊 DASHBOARD
// =======================
router.get('/dashboard', async (req, res) => {
  if (!req.session.admin) return res.send("Unauthorized");

  try {
    const students = await Student.find();

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
    <div class="container mt-4">

      <h2 class="mb-4">👋 Welcome Admin</h2>

      <form method="POST" action="/admin/mark-attendance">
      <table class="table table-bordered">
        <thead class="table-dark">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Roll</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
    `;

    students.forEach(student => {
      html += `
        <tr>
          <td>${student.name}</td>
          <td>${student.email || '-'}</td>
          <td>${student.roll || '-'}</td>
          <td>
            <input type="radio" name="attendance[${student._id}]" value="Present"> Present
            <input type="radio" name="attendance[${student._id}]" value="Absent"> Absent
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>

      <button class="btn btn-success">Submit Attendance</button>
      </form>

      <hr>

      <h4>Upload Notes</h4>
      <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
        <input class="form-control mb-2" type="text" name="title" placeholder="Title" required>
        <select class="form-control mb-2" name="class" required>
          ${[...Array(10)].map((_, i) => `<option value="${i+1}">Class ${i+1}</option>`)}
        </select>
        <input class="form-control mb-2" type="file" name="pdf" required>
        <button class="btn btn-primary">Upload</button>
      </form>

      <a href="/admin/logout" class="btn btn-danger mt-3">Logout</a>

    </div>
    </body>
    </html>
    `;

    // ✅ FIXED
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading dashboard");
  }
});

// =======================
// ✅ MARK ATTENDANCE
// =======================
router.post('/mark-attendance', async (req, res) => {
  const attendanceData = req.body.attendance;
  const date = new Date().toISOString().split('T')[0];

  try {
    for (const studentId in attendanceData) {
      const status = attendanceData[studentId];

      const existing = await Attendance.findOne({ student_id: studentId, date });

      if (!existing) {
        await Attendance.create({ student_id: studentId, status, date });
      }

      await sendAttendanceEmail(studentId, status, date);
    }

    res.send(`<h2>✅ Attendance + Emails Done</h2><a href="/admin/dashboard">Back</a>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// =======================
// 📤 UPLOAD NOTES
// =======================
router.post('/upload-note', upload.single('pdf'), async (req, res) => {
  try {
    const { title, class: className } = req.body;
    const file = req.file;

    if (!file || !title || !className) {
      return res.send("❌ Missing data");
    }

    const students = await Student.find({ className });

    const notes = students.map(s => ({
      student_id: s._id,
      title,
      file: file.filename
    }));

    await Notes.insertMany(notes);

    res.send("✅ Notes uploaded");

  } catch (err) {
    console.error(err);
    res.send("❌ Upload failed");
  }
});

// =======================
// ❌ DELETE STUDENT
// =======================
router.post('/delete-student/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    res.send("Error deleting");
  }
});

// =======================
// 🔓 LOGOUT
// =======================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.send("Logged out");
  });
});

module.exports = router;
