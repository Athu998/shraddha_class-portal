const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');

const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');
const Worksheet = require('../models/Worksheet');

// =======================
// 📧 EMAIL CONFIG (PRO)
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

// =======================
// 🏠 ROUTES
// =======================
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/login-form', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login-form.html'));
});

router.get('/register-form', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

// =======================
// 📝 REGISTER
// =======================
router.post('/register', async (req, res) => {
  const { name, dob, school_name, last_year_marks, parent_contact, address, email, password, className } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name, dob, school_name, last_year_marks,
      parent_contact, address, email,
      password: hashedPassword, className
    });

    await newStudent.save();

    // ✉️ PROFESSIONAL EMAIL
    await transporter.sendMail({
      from: "Shraddha Coaching Classes <trycoding06@gmail.com>",
      to: email,
      subject: "🎉 Welcome to Shraddha Coaching Classes",
      html: `
      <div style="font-family:Segoe UI;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:10px;overflow:hidden">
        
        <div style="background:#007bff;color:white;padding:20px;text-align:center">
          <h2>🎓 Shraddha Coaching Classes</h2>
          <p>Your Success Journey Starts Here 🚀</p>
        </div>

        <div style="padding:20px">
          <h3>Hello ${name}, 👋</h3>
          <p>Your registration was successfully completed.</p>

          <h4>📋 Your Details:</h4>
          <ul>
            <li><b>Class:</b> ${className}</li>
            <li><b>Email:</b> ${email}</li>
            <li><b>School:</b> ${school_name}</li>
          </ul>

          <p>👉 Login and start tracking your attendance, notes & performance.</p>

          <a href="https://your-app-link.onrender.com/students/login-form"
             style="display:inline-block;padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px">
             🔐 Login Now
          </a>
        </div>

        <div style="background:#f1f1f1;padding:15px;text-align:center">
          <p><b>Developed by Atharva Dhananjay More</b></p>
          <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank">
            🔗 LinkedIn Profile
          </a>
        </div>

      </div>
      `
    });

    res.send(`<h2>✅ Registered Successfully!</h2><a href="/students/login-form">Login</a>`);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// =======================
// 🔐 LOGIN
// =======================
router.post('/login', async (req, res) => {
  const { name, password } = req.body;

  try {
    const student = await Student.findOne({ name });
    if (!student) return res.send("❌ Student not found");

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) return res.send("❌ Wrong password");

    req.session.student = { id: student._id, name: student.name };

    res.redirect('/students/dashboard');

  } catch (err) {
    res.status(500).send("Login error");
  }
});

// =======================
// 📊 DASHBOARD (🔥 PRO UI)
// =======================
router.get('/dashboard', async (req, res) => {
  if (!req.session.student) return res.send("Unauthorized");

  const student = await Student.findById(req.session.student.id);
  const attendance = await Attendance.find({ student_id: student._id });
  const notes = await Notes.find({ student_id: student._id });
  const worksheets = await Worksheet.find();

  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'Present').length;
  const absent = total - present;

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Student Dashboard</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  </head>

  <body class="bg-light">

  <nav class="navbar navbar-dark bg-dark px-3">
    <span class="navbar-brand">🎓 Shraddha Coaching</span>
    <span class="text-white">Welcome, ${student.name}</span>
  </nav>

  <div class="container mt-4">

    <div class="row text-center">
      <div class="col-md-4">
        <div class="card shadow p-3">
          <h5>Total Days</h5>
          <h2>${total}</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow p-3 text-success">
          <h5>Present</h5>
          <h2>${present}</h2>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card shadow p-3 text-danger">
          <h5>Absent</h5>
          <h2>${absent}</h2>
        </div>
      </div>
    </div>

    <hr>

    <h4>📅 Attendance</h4>
    <table class="table table-bordered">
      <tr><th>Date</th><th>Status</th></tr>
      ${attendance.map(a => `
        <tr>
          <td>${new Date(a.date).toISOString().split('T')[0]}</td>
          <td>${a.status}</td>
        </tr>
      `).join('')}
    </table>

    <h4>📘 Notes</h4>
    ${notes.map(n => `
      <div>
        ${n.title} - <a href="/uploads/${n.file}" target="_blank">View</a>
      </div>
    `).join('')}

    <h4 class="mt-3">📝 Worksheets</h4>
    ${worksheets.map(w => `
      <div>
        ${w.title} - <a href="/uploads/${w.file}" target="_blank">View</a>
      </div>
    `).join('')}

    <hr>

    <div class="text-center mt-4">
      <p>🚀 <b>Developed & Maintained by Atharva Dhananjay More</b></p>
      <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank">
        🔗 Connect on LinkedIn
      </a>
    </div>

    <div class="text-center mt-3">
      <a href="/students/logout" class="btn btn-danger">Logout</a>
    </div>

  </div>

  </body>
  </html>
  `);
});

// باقي routes same (edit, delete, logout)

module.exports = router;
