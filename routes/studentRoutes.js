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

  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'Present').length;
  const absent = total - present;

  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>ERP Dashboard</title>

  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

  <style>
    body {
      background: linear-gradient(135deg, #1f2937, #111827);
      color: white;
      font-family: 'Segoe UI';
    }

    .navbar {
      background: rgba(0,0,0,0.7);
    }

    .card {
      border-radius: 15px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      transition: 0.3s;
    }

    .card:hover {
      transform: translateY(-5px);
    }

    .table {
      background: white;
      color: black;
      border-radius: 10px;
      overflow: hidden;
    }

    /* 🔥 GOOGLE LOADER */
    .loader {
      position: fixed;
      width: 100%;
      height: 100%;
      background: #111;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }

    .loader div {
      width: 15px;
      height: 15px;
      margin: 5px;
      border-radius: 50%;
      background: #4285F4;
      animation: bounce 0.6s infinite alternate;
    }

    .loader div:nth-child(2) { background: #EA4335; animation-delay: 0.2s; }
    .loader div:nth-child(3) { background: #FBBC05; animation-delay: 0.4s; }
    .loader div:nth-child(4) { background: #34A853; animation-delay: 0.6s; }

    @keyframes bounce {
      to { transform: translateY(-15px); }
    }

    .popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      color: black;
      padding: 20px;
      border-radius: 10px;
      display: none;
      z-index: 9999;
    }

    .footer {
      text-align: center;
      margin-top: 50px;
      opacity: 0.8;
    }
  </style>
</head>

<body>

<!-- 🔥 LOADER -->
<div class="loader" id="loader">
  <div></div><div></div><div></div><div></div>
</div>

<nav class="navbar p-3 d-flex justify-content-between">
  <h4>🎓 Shraddha ERP</h4>

  <div>
    <a href="/" class="btn btn-light btn-sm">🏠 Home</a>
    <a href="/students/logout" class="btn btn-danger btn-sm">Logout</a>
  </div>
</nav>

<div class="container mt-4">

  <h5>Welcome, ${student.name}</h5>

  <div class="row text-center g-4 mt-2">
    <div class="col-md-4">
      <div class="card p-4">
        <h5>Total Days</h5>
        <h1>${total}</h1>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card p-4 text-success">
        <h5>Present</h5>
        <h1>${present}</h1>
      </div>
    </div>

    <div class="col-md-4">
      <div class="card p-4 text-danger">
        <h5>Absent</h5>
        <h1>${absent}</h1>
      </div>
    </div>
  </div>

  <hr>

  <h4>📅 Attendance</h4>

  <table class="table mt-3">
    <tr><th>Date</th><th>Status</th></tr>
    ${attendance.map(a => `
      <tr>
        <td>${new Date(a.date).toISOString().split('T')[0]}</td>
        <td>${a.status}</td>
      </tr>
    `).join('')}
  </table>

  <div class="footer">
    🚀 Developed & Maintained by <b>Atharva Dhananjay More</b><br>
    <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" style="color:lightblue;">
      Connect on LinkedIn
    </a>
  </div>

</div>

<!-- 🔥 POPUP -->
<div class="popup" id="popup">
  <h5>👋 Welcome!</h5>
  <p>This ERP is built by</p>
  <b>Atharva Dhananjay More</b><br><br>
  <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" class="btn btn-primary btn-sm">
    Visit LinkedIn
  </a>
</div>

<script>
  // Loader remove after load
  window.onload = () => {
    document.getElementById("loader").style.display = "none";
  };

  // Popup after 5 sec
  setTimeout(() => {
    document.getElementById("popup").style.display = "block";
  }, 5000);

  // Auto hide popup
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
