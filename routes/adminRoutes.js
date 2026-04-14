// === File: routes/admin.js ===
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

// Serve static files
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ✅ FIX: Create the transporter ONCE globally to prevent Gmail from blocking multiple rapid connections
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'trycoding06@gmail.com',
    pass: 'fcusbcnwonkartjg' // Note: Make sure this is an App Password, not your normal Gmail password!
  }
});

// Attendance email function
async function sendAttendanceEmail(studentId, status, date) {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.email) {
        console.log(`⚠️ Skipped email for ID ${studentId} - No email found.`);
        return;
    }

    const mailOptions = {
      from: '"Shraddha Coaching Classes" <trycoding06@gmail.com>',
      to: student.email,
      subject: 'Attendance Notification',
      text: `Hello ${student.name},\n\nYour attendance for ${date} is marked as: ${status}.\n\nIn Shraddha Coaching Classes\nThank you!\nDeveloped and Maintained by Atharva Dhananjay More`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${student.email}`);
  } catch (err) {
    console.error(`❌ Email sending failed for ID ${studentId}:`, err);
  }
}

// Multer setup
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Admin login routes
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
    console.error("Admin login error:", err);
    res.status(500).send("Server error during login");
  }
});

// Dashboard route
router.get('/dashboard', async (req, res) => {
  if (!req.session.admin) return res.send("Unauthorized");

  try {
    const students = await Student.find();
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Admin Dashboard</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; padding: 20px; }
        .container { max-width: 1200px; margin: auto; background: #fff; padding: 30px; border-radius: 10px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); animation: fadeInUp 0.6s ease-in-out; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #007bff; color: white; }
        tr:hover { background-color: #f1f1f1; }
        .btn-primary { background-color: #007bff; color: white; border: none; padding: 10px 20px; margin-top: 20px; cursor: pointer; font-size: 16px; border-radius: 5px; }
        .btn-primary:hover { background-color: #0056b3; }
        .btn-success { background-color: #28a745; color: white; border: none; padding: 10px 20px; margin-top: 20px; cursor: pointer; font-size: 16px; border-radius: 5px; }
        .btn-success:hover { background-color: #218838; }
        .btn-danger { background-color: #dc3545; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 5px; }
        .btn-danger:hover { background-color: #c82333; }
        .logout { float: right; margin-top: 0; }
        .header-flex { display: flex; justify-content: space-between; align-items: center; }
        hr { margin: 30px 0; border: 1px solid #eee; }
        input[type="text"], input[type="file"], select { width: 100%; padding: 10px; margin: 10px 0; border: 1px solid #ccc; border-radius: 5px; box-sizing: border-box; }
      </style>
    </head>
    <body>
    <div class="container animate__animated animate__fadeInUp">
      <div class="header-flex">
        <h2>👋 Welcome, Admin</h2>
        <form action="/admin/logout" method="GET">
          <button type="submit" class="btn-danger logout">🔓 Logout</button>
        </form>
      </div>

      <form method="POST" action="/admin/mark-attendance">
        <h3>✅ Mark Attendance</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Roll No</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
    `;

    students.forEach(student => {
      html += `
        <tr>
          <td>${student._id.toString().slice(-6)}</td> <td>${student.name}</td>
          <td>${student.email || '-'}</td>
          <td>${student.roll || '-'}</td>
          <td>
            <label><input type="radio" name="attendance[${student._id}]" value="Present" required> Present</label>
            <label><input type="radio" name="attendance[${student._id}]" value="Absent"> Absent</label>
          </td>
          <td>
            <form method="POST" action="/admin/delete-student/${student._id}" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete ${student.name}?');">
              <button type="submit" class="btn-danger">Delete</button>
            </form>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
        <button type="submit" class="btn-success">📩 Submit Attendance</button>
      </form>
      
      <hr>

      <h3>📤 Upload Notes PDF</h3>
      <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
        <label>Note Title:</label>
        <input type="text" name="title" placeholder="e.g., Chapter 1 Physics" required>
        
        <label>Select Class:</label>
        <select name="class" required>
          <option value="">-- Select Class --</option>
          ${[...Array(12)].map((_, i) => `<option value="${i + 1}">Class ${i + 1}</option>`).join('')}
        </select>
        
        <label>Upload PDF:</label>
        <input type="file" name="pdf" accept="application/pdf" required>
        
        <button type="submit" class="btn-primary">📄 Upload Note</button>
      </form>
    </div>
    </body>
    </html>
    `;

    // ✅ FIX: changed from res.sendFile(html) to res.send(html)
    res.send(html); 
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Attendance submission
router.post('/mark-attendance', async (req, res) => {
  const attendanceData = req.body.attendance;
  const date = new Date().toISOString().split('T')[0];

  if (!attendanceData) {
      return res.status(400).send("❌ No attendance data submitted. <br><a href='/admin/dashboard'>Back to Dashboard</a>");
  }

  try {
    // Process emails asynchronously without blocking the loop entirely
    const emailPromises = [];

    for (const studentId in attendanceData) {
      const status = attendanceData[studentId];

      const existing = await Attendance.findOne({ student_id: studentId, date });
      if (!existing) {
        await Attendance.create({ student_id: studentId, status, date });
      }

      // Add to array of promises so they can be executed together
      emailPromises.push(sendAttendanceEmail(studentId, status, date));
    }

    // Await all emails to finish sending
    await Promise.all(emailPromises);

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: green;">✅ Attendance marked and emails sent!</h2>
        <a href="/admin/dashboard" style="padding: 10px 20px; background: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Back to Dashboard</a>
      </div>
    `);
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).send("Error saving attendance");
  }
});

// Upload notes route
router.post('/upload-note', upload.single('pdf'), async (req, res) => {
  try {
    const { title = '', class: className = '' } = req.body;
    const file = req.file;

    if (!file || !title.trim() || !className.trim()) {
      return res.status(400).send("❌ All fields are required and file must be uploaded.");
    }

    const students = await Student.find({ className: className.trim() });
    if (!students.length) {
      return res.status(404).send(`❌ No students found in class ${className}`);
    }

    const notesToInsert = students.map(student => ({
      student_id: student._id,
      title: title.trim(),
      file: file.filename
    }));

    await Notes.insertMany(notesToInsert);

    res.send(`
      <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
        <h2 style="color: green;">✅ Notes uploaded for ${students.length} students in class ${className}!</h2>
        <a href="/admin/dashboard" style="text-decoration: none; background-color: #007bff; padding: 10px 20px; color: white; border-radius: 5px;">Back to Dashboard</a>
      </div>
    `);
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).send("❌ Server error while uploading.");
  }
});

// ✅ DELETE Student Route
router.post('/delete-student/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("❌ Error deleting student:", err);
    res.status(500).send("❌ Server error while deleting student");
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.send("🔓 Admin logged out. <a href='/admin/login'>Login again</a>");
  });
});

// Export the router once
module.exports = router;
