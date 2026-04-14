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
  if (!req.session.student) return res.redirect('/');

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

  <style>
    body {
      margin: 0;
      height: 100vh;
      background: linear-gradient(135deg, #00c6ff, #0072ff);
      font-family: 'Segoe UI';
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .main-container {
      width: 95%;
      max-width: 1200px;
      height: 90vh;
      background: white;
      border-radius: 20px;
      display: flex;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0,0,0,0.2);
    }

    .left-panel {
      flex: 1;
      background: linear-gradient(135deg, #0072ff, #00c6ff);
      color: white;
      padding: 40px;
    }

    .right-panel {
      flex: 1.5;
      padding: 25px;
      overflow-y: auto;
    }

    .card-box {
      background: #f8f9fa;
      border-radius: 15px;
      padding: 15px;
      text-align: center;
    }

    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }

    .popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 20px;
      border-radius: 10px;
      display: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
  </style>
</head>

<body>

<div class="main-container">

  <!-- LEFT -->
  <div class="left-panel">
    <h2>🎓 Shraddha ERP</h2>
    <p class="mt-3">All your academic data in one place.</p>

    <h5 class="mt-4">${student.name}</h5>

    <a href="/" class="btn btn-light btn-sm mt-3">🏠 Home</a><br>
    <a href="/students/logout" class="btn btn-danger btn-sm mt-2">Logout</a>

    <div class="mt-5">
      <small>🚀 Developed by Atharva More</small><br>
      <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" style="color:white;">
        LinkedIn
      </a>
    </div>
  </div>

  <!-- RIGHT -->
  <div class="right-panel">

    <h4>📊 Dashboard</h4>

    <div class="row g-3">
      <div class="col-md-4"><div class="card-box"><h6>Total</h6><h3>${total}</h3></div></div>
      <div class="col-md-4"><div class="card-box text-success"><h6>Present</h6><h3>${present}</h3></div></div>
      <div class="col-md-4"><div class="card-box text-danger"><h6>Absent</h6><h3>${absent}</h3></div></div>
    </div>

    <hr>

    <!-- ATTENDANCE -->
    <h5>📅 Attendance</h5>
    <table class="table table-bordered mt-2">
      <tr><th>Date</th><th>Status</th></tr>
      ${attendance.map(a => `
        <tr>
          <td>${new Date(a.date).toISOString().split('T')[0]}</td>
          <td>${a.status}</td>
        </tr>
      `).join('')}
    </table>

    <!-- NOTES -->
    <h5 class="mt-4">📘 Notes</h5>
    ${notes.length === 0 ? "<p>No notes available</p>" : notes.map(n => `
      <div>
        ${n.title} - <a href="/uploads/${n.file}" target="_blank">View</a>
      </div>
    `).join('')}

    <!-- WORKSHEETS -->
    <h5 class="mt-4">📝 Worksheets</h5>
    ${worksheets.length === 0 ? "<p>No worksheets</p>" : worksheets.map(w => `
      <div>
        ${w.title} - <a href="/uploads/${w.file}" target="_blank">View</a>
      </div>
    `).join('')}

    <!-- FOOTER -->
    <div class="footer">
      🚀 Developed & Maintained by <b>Atharva Dhananjay More</b><br>
      <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank">
        Connect on LinkedIn
      </a>
    </div>

  </div>

</div>

<!-- POPUP -->
<div class="popup" id="popup">
  <b>Atharva Dhananjay More</b><br>
  <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank">Visit LinkedIn</a>
</div>

<script>
  setTimeout(() => {
    document.getElementById("popup").style.display = "block";
  }, 5000);

  setTimeout(() => {
    document.getElementById("popup").style.display = "none";
  }, 15000);
</script>

</body>
</html>
  `);
});
// باقي routes same (edit, delete, logout)

module.exports = router;
