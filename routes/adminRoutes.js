// === File: routes/admin.js ===
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');
const Worksheet = require('../models/Worksheet')
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');

router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));


async function sendAttendanceEmail(studentId, status, date) {
    const student = await Student.findById(studentId);
    if (!student || !student.email) return;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'trycoding06@gmail.com',
            pass: 'fcusbcnwonkartjg'
        }
    });

    const mailOptions = {
        from: 'trycoding06@gmail.com',
        to: student.email,
        subject: 'Attendance Notification',
        text: `Hello ${student.name},\n\nYour attendance for ${date} is marked as: ${status}.\n in Shraddha  Coaching Classes\nThank you! \n Devloped and Maintended by Atharva Dhananjay More`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${student.email}`);
    } catch (err) {
        console.error("❌ Email sending failed:", err);
    }
}


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

router.get('/dashboard', async (req, res) => {
  if (!req.session.admin) return res.send("Unauthorized");

  try {
    const students = await Student.find();

    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Admin Dashboard</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: auto;
          background: #fff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
          animation: fadeInUp 0.6s ease-in-out;
        }
        h2, h3 {
          color: #2c3e50;
          margin-bottom: 10px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #dee2e6;
        }
        th {
          background-color: #007bff;
          color: white;
        }
        tr:hover {
          background-color: #f1f1f1;
        }
        button {
          background-color: #28a745;
          border: none;
          color: white;
          padding: 10px 20px;
          margin-top: 20px;
          cursor: pointer;
          font-size: 16px;
          border-radius: 5px;
          transition: background 0.3s;
        }
        button:hover {
          background-color: #218838;
        }
        .logout {
          float: right;
          background-color: #dc3545;
        }
        .logout:hover {
          background-color: #c82333;
        }
        input[type="text"], input[type="file"] {
          padding: 8px;
          width: 100%;
          max-width: 400px;
          margin-bottom: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        label {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container animate__animated animate__fadeInUp">
        <h2>👋 Welcome, Admin</h2>

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
              </tr>
            </thead>
            <tbody>
    `;

    students.forEach(student => {
      html += `
        <tr>
          <td>${student._id}</td>
          <td>${student.name}</td>
          <td>${student.email || '-'}</td>
          <td>${student.roll || '-'}</td>
          <td>
            <label><input type="radio" name="attendance[${student._id}]" value="Present"> Present</label>
            <label><input type="radio" name="attendance[${student._id}]" value="Absent"> Absent</label>
          </td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
          <button type="submit">📩 Submit Attendance</button>
        </form>

        <form action="/admin/logout" method="GET">
          <button type="submit" class="logout">🔓 Logout</button>
        </form>

        <hr><h3>📤 Upload Notes PDF</h3>
        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
          <label>Note Title:</label><br>
          <input type="text" name="title" required><br>

          <label>Select Class:</label><br>
<select name="class" required>
  <option value="">-- Select Class --</option>
  ${[...Array(10)].map((_, i) => `<option value="${i + 1}">Class ${i + 1}</option>`).join('')}
</select><br>


          <label>Upload PDF:</label><br>
          <input type="file" name="pdf" accept="application/pdf" required><br>

          <button type="submit">📄 Upload Note</button>
        </form>
      </div>
    </body>
    </html>
    `;

    res.send(html);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Mark Attendance Route
router.post('/mark-attendance', async (req, res) => {
  const attendanceData = req.body.attendance;
  const date = new Date().toISOString().split('T')[0];

  try {
    for (const studentId in attendanceData) {
      const status = attendanceData[studentId];

      const existing = await Attendance.findOne({ student_id: studentId, date });
      if (!existing) {
        await Attendance.create({
          student_id: studentId,
          status,
          date
        });
      }

      await sendAttendanceEmail(studentId, status, date);
    }

    res.send(`<h2>✅ Attendance marked and emails sent!</h2><a href="/admin/dashboard">Back to Dashboard</a>`);
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).send("Error saving attendance");
  }
});

// Upload Notes Route
router.post('/upload-note', upload.single('pdf'), async (req, res) => {
  try {
    const { title = '', class: className = '' } = req.body;
    const file = req.file;

    if (!file || !title.trim() || !className.trim()) {
      return res.status(400).send("❌ All fields are required and file must be uploaded.");
    }

    // Find all students in that class
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
      <div style="text-align: center; font-family: sans-serif;">
        <h2 style="color: green;">✅ Notes uploaded for ${students.length} students in class ${className}!</h2>
        <a href="/admin/dashboard" style="text-decoration: none; background-color: #007bff; padding: 10px 20px; color: white; border-radius: 5px;">Back to Dashboard</a>
      </div>
    `);
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).send("❌ Server error while uploading.");
  }
});


module.exports = router;



router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send("🔓 Admin logged out. <a href='/admin/login'>Login again</a>");
    });
});

module.exports = router;