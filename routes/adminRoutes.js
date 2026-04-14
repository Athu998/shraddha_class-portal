const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');

// Models
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');

// ==========================================
// 🛡️ MIDDLEWARE & CONFIG
// ==========================================

const checkAdmin = (req, res, next) => {
    if (req.session.admin) return next();
    res.redirect('/admin/login');
};

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "trycoding06@gmail.com",
        pass: "fcusbcnwonkartjg" 
    }
});

const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// ==========================================
// 📧 HELPER FUNCTIONS
// ==========================================

async function sendAttendanceEmail(studentId, status, date) {
    try {
        const student = await Student.findById(studentId);
        if (!student || !student.email) return;

        await transporter.sendMail({
            from: '"Shraddha Classes" <trycoding06@gmail.com>',
            to: student.email,
            subject: `Attendance Update: ${date}`,
            html: `
<div style="font-family:Segoe UI, sans-serif; max-width:600px; margin:auto; border:1px solid #eee; border-radius:12px; overflow:hidden;">
  <div style="background:#2b88f0; color:white; padding:15px; text-align:center;">
    <h2 style="margin:0;">📚 Shraddha Coaching Classes</h2>
  </div>
  <div style="padding:20px;">
    <p>Hello <strong>${student.name}</strong>,</p>
    <p>Your attendance for <strong>${date}</strong> is:</p>
    <p style="font-size:18px; font-weight:bold; color:${status === 'Present' ? '#10b981' : '#ef4444'};">
      ${status}
    </p>
    <hr>
    <p style="font-size:13px; color:#555;">Stay consistent and keep improving 📈</p>
  </div>
</div>
`
        });
    } catch (err) {
        console.error(`❌ Email Error: ${err.message}`);
    }
}

// ==========================================
// 🎓 STUDENT ROUTES (Fixed Path)
// ==========================================

// CHANGED: Explicitly set to '/students/register'
router.post('/students/register', async (req, res) => {
  const { name, dob, school_name, last_year_marks, parent_contact, address, email, password, className } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStudent = new Student({
      name, dob, school_name, last_year_marks,
      parent_contact, address, email,
      password: hashedPassword, className
    });

    await newStudent.save();

    await transporter.sendMail({
      from: "Shraddha Coaching Classes <trycoding06@gmail.com>",
      to: email,
      subject: "🎉 Welcome to Shraddha Coaching Classes",
      html: `
<div style="font-family:Segoe UI, sans-serif; max-width:600px; margin:auto; border:1px solid #ddd; border-radius:12px; overflow:hidden">
  <div style="background:#007bff; color:white; padding:20px; text-align:center">
    <h2 style="margin:0;">🎓 Shraddha Coaching Classes</h2>
    <p style="margin:5px 0 0;">Your Success Journey Starts Here 🚀</p>
  </div>
  <div style="padding:20px">
    <h3>Hello ${name}, 👋</h3>
    <p>Your registration was successfully completed.</p>
    <a href="https://shraddha-classes.onrender.com/" style="display:inline-block;padding:10px 20px;background:#28a745;color:white;text-decoration:none;border-radius:5px">🔐 Login Now</a>
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

// ==========================================
// 🔐 ADMIN AUTH & DASHBOARD ROUTES (Fixed Paths)
// ==========================================

// CHANGED: Explicitly set to '/admin/login'
router.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

// CHANGED: Explicitly set to '/admin/login'
router.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await Admin.findOne({ username });
        if (admin && await bcrypt.compare(password, admin.password)) {
            req.session.admin = { id: admin._id, username: admin.username };
            return res.redirect('/admin/dashboard');
        }
        res.send("<script>alert('Invalid Credentials'); window.location='/admin/login';</script>");
    } catch (err) {
        res.status(500).send("Login Error");
    }
});

// CHANGED: Explicitly set to '/admin/dashboard'
router.get('/admin/dashboard', checkAdmin, async (req, res) => {
    try {
        const students = await Student.find().sort({ name: 1 });
        
        // Passing the dashboard HTML (condensed for brevity, but logically identical)
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard | Shraddha ERP</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --primary: #2b88f0; --bg: #0f172a; }
                body { background-color: #f1f5f9; font-family: 'Inter', sans-serif; margin: 0; padding: 0; }
                .navbar { background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,0.05); padding: 15px 0; }
                .card { border: none; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); background: #fff; }
                .status-radio input { display: none; }
                .status-radio label { padding: 5px 15px; border-radius: 20px; cursor: pointer; border: 1px solid #e2e8f0; font-size: 0.85rem; transition: 0.2s; font-weight: 500; color: #64748b; }
                .radio-p:checked + label { background: #dcfce7; color: #15803d; border-color: #10b981; }
                .radio-a:checked + label { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }
                footer { background: #0f172a; color: #94a3b8; padding: 30px 0; margin-top: 60px; }
                #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); z-index:9999; display:none; flex-direction:column; justify-content:center; align-items:center; }
            </style>
        </head>
        <body>
        <div id="loader"><div class="spinner-border text-primary"></div><p class="mt-2 fw-bold">Syncing Data...</p></div>

        <nav class="navbar sticky-top mb-5">
            <div class="container">
                <a class="navbar-brand fw-bold text-primary" href="#"><i class="fas fa-graduation-cap me-2"></i>SHRADDHA Classes</a>
                <div class="d-flex align-items-center">
                    <span class="me-3 text-muted small d-none d-md-block" id="liveClock"></span>
                    <a href="/admin/logout" class="btn btn-outline-danger btn-sm rounded-pill px-3">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container">
            <div class="row g-4">
                <div class="col-12">
                    <div class="card p-4">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold mb-0">Attendance Control</h4>
                            <span class="badge bg-primary-subtle text-primary rounded-pill px-3">${new Date().toDateString()}</span>
                              <a href="/students/register-form" class="btn btn-success btn-custom">🎓 Student Register</a>
                        </div>
                        
                        <form id="attendanceForm" action="/admin/mark-attendance" method="POST">
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr class="text-muted small">
                                            <th>STUDENT</th>
                                            <th>ROLL NO</th>
                                            <th class="text-center">ATTENDANCE</th>
                                            <th class="text-center">ACTION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${students.map(s => `
                                        <tr>
                                            <td>
                                                <div class="fw-bold">${s.name}</div>
                                                <div class="small text-muted">${s.email || 'no-email@link.com'}</div>
                                            </td>
                                            <td><span class="badge bg-light text-dark border">#${s.roll || 'N/A'}</span></td>
                                            <td class="text-center">
                                                <div class="status-radio d-flex justify-content-center gap-2">
                                                    <input type="radio" id="p-${s._id}" name="attendance[${s._id}]" value="Present" class="radio-p" required>
                                                    <label for="p-${s._id}">Present</label>
                                                    <input type="radio" id="a-${s._id}" name="attendance[${s._id}]" value="Absent" class="radio-a">
                                                    <label for="a-${s._id}">Absent</label>
                                                </div>
                                            </td>
                                            <td class="text-center">
                                                <button type="button" class="btn text-danger btn-sm border-0" onclick="confirmDelete('${s._id}', '${s.name}')">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
                                            </td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 mt-3 py-2 fw-bold rounded-pill shadow-sm">
                                <i class="fas fa-check-circle me-2"></i>Submit & Send Emails
                            </button>
                        </form>
                    </div>
                </div>

                <div class="col-md-6 mx-auto">
                    <div class="card p-4 bg-primary text-white shadow-lg">
                        <h5 class="fw-bold mb-3"><i class="fas fa-upload me-2"></i>Push Study Material</h5>
                        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
                            <input type="text" name="title" class="form-control mb-2 border-0" placeholder="Chapter Title" required>
                            <select name="class" class="form-select mb-2 border-0" required>
                                <option value="">Select Class</option>
                                ${[8, 9, 10, 11, 12].map(c => `<option value="${c}">Class ${c}</option>`).join('')}
                            </select>
                            <input type="file" name="pdf" class="form-control mb-3 border-0" accept="application/pdf" required>
                            <button class="btn btn-light w-100 fw-bold text-primary rounded-pill">Upload PDF</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <script>
            function updateClock() {
                const now = new Date().toLocaleString();
                document.getElementById('liveClock').innerText = now;
            }
            setInterval(updateClock, 1000); updateClock();

            document.getElementById('attendanceForm').onsubmit = () => document.getElementById('loader').style.display = 'flex';
            
            function confirmDelete(id, name) {
                if(confirm('Are you sure you want to permanently delete ' + name + '?')) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = '/admin/delete-student/' + id;
                    document.body.appendChild(form);
                    form.submit();
                }
            }
        </script>
        </body>
        </html>
        `;
        res.send(html);
    } catch (err) {
        res.status(500).send("Dashboard Error");
    }
});

// ==========================================
// ⚙️ POST ACTIONS (Fixed Paths)
// ==========================================

// CHANGED: Explicitly set to '/admin/mark-attendance'
router.post('/admin/mark-attendance', checkAdmin, async (req, res) => {
    const attendanceData = req.body.attendance;
    const date = new Date().toISOString().split('T')[0];
    try {
        if (!attendanceData) return res.redirect('/admin/dashboard');
        const tasks = Object.entries(attendanceData).map(async ([studentId, status]) => {
            await Attendance.findOneAndUpdate({ student_id: studentId, date }, { status }, { upsert: true });
            return sendAttendanceEmail(studentId, status, date);
        });
        await Promise.all(tasks);
        res.send("<script>alert('Attendance Synced Successfully!'); window.location='/admin/dashboard';</script>");
    } catch (err) { res.status(500).send("Error"); }
});

// CHANGED: Explicitly set to '/admin/upload-note'
router.post('/admin/upload-note', checkAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { title, class: className } = req.body;
        const students = await Student.find({ className });
        const notes = students.map(s => ({ student_id: s._id, title, file: req.file.filename }));
        await Notes.insertMany(notes);
        res.send("<script>alert('Notes Uploaded!'); window.location='/admin/dashboard';</script>");
    } catch (err) { res.send("Error"); }
});

// CHANGED: Explicitly set to '/admin/delete-student/:id'
router.post('/admin/delete-student/:id', checkAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) { res.send("Error"); }
});

// CHANGED: Explicitly set to '/admin/logout'
router.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
