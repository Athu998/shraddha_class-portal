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
<div style="font-family:Segoe UI, sans-serif; max-width:600px; margin:auto; border:1px solid #ddd; border-radius:12px; overflow:hidden">

  <!-- HEADER -->
  <div style="background:#007bff; color:white; padding:20px; text-align:center">
    <h2 style="margin:0;">🎓 Shraddha Coaching Classes</h2>
    <p style="margin:5px 0 0;">Your Success Journey Starts Here 🚀</p>
  </div>

  <!-- CONTENT -->
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

    <a href="https://shraddha-classes.onrender.com/"
       style="display:inline-block;padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px">
       🔐 Login Now
    </a>
  </div>

  <!-- FOOTER / BRANDING -->
  <div style="background:#f9fafb; padding:15px; text-align:center; font-size:13px; color:#555">

    <p>
      🚀 Developed & Maintained by 
      <a href="https://www.linkedin.com/in/atharva-more-34a015194/" 
         target="_blank" 
         style="color:#007bff; text-decoration:none;">
        <b>Atharva Dhananjay More</b>
      </a>
    </p>

    <p>Full Stack Developer | ERP & Web Solutions</p>

    <p>
      Empowering education through smart digital solutions 🚀<br>
      Crafted with ❤️ in Mumbai 🇮🇳 / Nashik 🇮🇳
    </p>

    <!-- WHATSAPP BUTTON -->
    <div style="margin-top:10px;">
      <a href="https://wa.me/919325155560?text=Hi%20I%20want%20a%20website%20like%20this"
         target="_blank"
         style="display:inline-block;padding:8px 15px;background:#25D366;color:white;border-radius:20px;text-decoration:none;font-weight:bold;">
         💬 Chat on WhatsApp
      </a>
    </div>

    <!-- CONTACT CTA -->
    <p style="margin-top:10px;">
      💼 Want a website like this? 
      <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" style="color:#007bff;">
        Contact Developer
      </a>
    </p>

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

  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

  <style>
    body { background:#f4f6f9; font-family:'Segoe UI'; }

    .header {
      background:white; padding:15px 30px;
      display:flex; justify-content:space-between;
      box-shadow:0 2px 10px rgba(0,0,0,0.05);
    }

    .logo { font-weight:bold; color:#007bff; }

    .main-container { max-width:1100px; margin:auto; margin-top:30px; }

    .card-box, .section-box {
      background:white; border-radius:15px;
      padding:20px; margin-top:20px;
      box-shadow:0 5px 15px rgba(0,0,0,0.05);
    }

    .footer {
      background:#0b1a2f; color:#ccc;
      padding:30px; margin-top:40px; text-align:center;
    }

    .dev-link { color:#00c6ff; text-decoration:none; }
    .dev-link:hover { color:#0dcaf0; text-decoration:underline; }

    .popup {
      position:fixed; top:20px; right:20px;
      background:white; padding:20px;
      border-radius:10px; display:none;
      box-shadow:0 10px 25px rgba(0,0,0,0.2);
      max-width:250px;
    }
  </style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div class="logo">🎓 SHRADDDHA Classes</div>

  <div>
    🚀 Developed by 
    <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" class="dev-link">
      <b>Atharva More</b>
    </a>
    <a href="/" class="btn btn-light btn-sm ms-2">Home</a>
  </div>
</div>

<div class="main-container">

  <h5>Welcome, ${student.name}</h5>

  <!-- CARDS -->
  <div class="row g-3">
    <div class="col-md-4"><div class="card-box"><h6>Total</h6><h3>${total}</h3></div></div>
    <div class="col-md-4"><div class="card-box text-success"><h6>Present</h6><h3>${present}</h3></div></div>
    <div class="col-md-4"><div class="card-box text-danger"><h6>Absent</h6><h3>${absent}</h3></div></div>
  </div>

  <!-- GRAPH -->
  <div class="section-box text-center">
  <h5>📊 Attendance Overview</h5>

  <div style="max-width:300px; margin:auto;">
    <canvas id="attendanceChart"></canvas>
  </div>

</div>

  <!-- ATTENDANCE -->
  <div class="section-box">
    <h5>📅 Attendance</h5>
    <table class="table">
      <tr><th>Date</th><th>Status</th></tr>
      ${attendance.map(a => `
        <tr>
          <td>${new Date(a.date).toISOString().split('T')[0]}</td>
          <td>${a.status}</td>
        </tr>
      `).join('')}
    </table>
  </div>

  <!-- NOTES -->
  <div class="section-box">
    <h5>📘 Notes</h5>
    ${notes.map(n => `${n.title} - <a href="/uploads/${n.file}" target="_blank">View</a>`).join('<br>')}
  </div>

  <!-- WORKSHEETS -->
  <div class="section-box">
    <h5>📝 Worksheets</h5>
    ${worksheets.map(w => `${w.title} - <a href="/uploads/${w.file}" target="_blank">View</a>`).join('<br>')}
  </div>

</div>

<!-- FOOTER -->
<div class="footer">
  🚀 Developed & Maintained by 
  <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" class="dev-link">
    <b>Atharva Dhananjay More</b>
  </a><br>

  Full Stack Developer | ERP Solutions <br>
  Crafted with ❤️ in Mumbai 🇮🇳 <br>

  💼 Want a website like this? 
  <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" class="dev-link">
    Contact Developer
  </a>
</div>

<!-- POPUP (same as footer) -->
<div class="popup" id="popup">
  🚀 <b>Atharva Dhananjay More</b><br>
  Full Stack Developer<br><br>

  💼 Need a website?<br>
  <a href="https://www.linkedin.com/in/atharva-more-34a015194/" target="_blank" class="dev-link">
    Contact Me
  </a>
</div>

<script>
  new Chart(document.getElementById('attendanceChart'), {
    type: 'doughnut',
    data: {
      labels: ['Present','Absent'],
      datasets: [{
        data: [${present}, ${absent}],
        backgroundColor: ['#28a745','#dc3545'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%', // donut size
      plugins: {
        legend: {
          position: 'top'
        }
      }
    }
  });
</script>
</body>
</html>
`);
});
// باقي routes same (edit, delete, logout)

module.exports = router;
