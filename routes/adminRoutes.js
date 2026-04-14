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
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2b88f0;">Attendance Notification</h2>
                    <p>Hello <strong>${student.name}</strong>,</p>
                    <p>Your attendance for <strong>${date}</strong> is: 
                       <span style="color: ${status === 'Present' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</span>.
                    </p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">Shraddha Coaching Classes, Nashik</p>
                </div>
            `
        });
    } catch (err) {
        console.error(`❌ Email Error: ${err.message}`);
    }
}

// ==========================================
// 🔐 AUTH ROUTES
// ==========================================

router.get(['/login', '/admin-login'], (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin-login.html'));
});

router.post('/login', async (req, res) => {
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

// ==========================================
// 📊 DASHBOARD
// ==========================================

router.get('/dashboard', checkAdmin, async (req, res) => {
    try {
        const students = await Student.find().sort({ name: 1 });
        
        const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Dashboard</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --primary: #2b88f0; --bg: #f8fafc; }
                body { background-color: var(--bg); font-family: 'Inter', sans-serif; }
                .card { border: none; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
                .status-radio input { display: none; }
                .status-radio label { 
                    padding: 5px 15px; border-radius: 20px; cursor: pointer; border: 1px solid #e2e8f0; 
                    font-size: 0.85rem; transition: 0.2s; font-weight: 500;
                }
                .radio-p:checked + label { background: #dcfce7; color: #15803d; border-color: #10b981; }
                .radio-a:checked + label { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }
                #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); 
                          z-index:9999; display:none; flex-direction:column; justify-content:center; align-items:center; }
            </style>
        </head>
        <body>

        <div id="loader"><div class="spinner-border text-primary"></div><p class="mt-2">Notifying Students...</p></div>

        <nav class="navbar navbar-light bg-white shadow-sm mb-4">
            <div class="container">
                <span class="navbar-brand fw-bold text-primary">SHRADDHA ERP</span>
                <a href="/admin/logout" class="btn btn-outline-danger btn-sm rounded-pill">Logout</a>
            </div>
        </nav>

        <div class="container">
            <div class="row">
                <div class="col-12">
                    <div class="card p-4 mb-4">
                        <h4 class="fw-bold mb-4">Attendance Management</h4>
                        <form id="attendanceForm" action="/admin/mark-attendance" method="POST">
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Roll No</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Delete</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${students.map(s => `
                                        <tr>
                                            <td><strong>${s.name}</strong><br><small class="text-muted">${s.email || ''}</small></td>
                                            <td>${s.roll || 'N/A'}</td>
                                            <td class="text-center">
                                                <div class="status-radio d-flex justify-content-center gap-2">
                                                    <input type="radio" id="p-${s._id}" name="attendance[${s._id}]" value="Present" class="radio-p" required>
                                                    <label for="p-${s._id}">Present</label>
                                                    <input type="radio" id="a-${s._id}" name="attendance[${s._id}]" value="Absent" class="radio-a">
                                                    <label for="a-${s._id}">Absent</label>
                                                </div>
                                            </td>
                                            <td class="text-center">
                                                <button type="button" class="btn text-danger btn-sm" onclick="confirmDelete('${s._id}', '${s.name}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 mt-3 py-2 fw-bold">Submit Attendance</button>
                        </form>
                    </div>
                </div>

                <div class="col-md-6 mx-auto">
                    <div class="card p-4 bg-primary text-white">
                        <h5 class="fw-bold mb-3">Upload Notes</h5>
                        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
                            <input type="text" name="title" class="form-control mb-2 border-0" placeholder="Title" required>
                            <select name="class" class="form-select mb-2 border-0" required>
                                <option value="">Class</option>
                                ${[8, 9, 10, 11, 12].map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                            <input type="file" name="pdf" class="form-control mb-3 border-0" accept="application/pdf" required>
                            <button class="btn btn-light w-100 fw-bold text-primary">Upload PDF</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <script>
            document.getElementById('attendanceForm').onsubmit = () => document.getElementById('loader').style.display = 'flex';
            function confirmDelete(id, name) {
                if(confirm('Delete ' + name + '?')) {
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
// ⚙️ POST ACTIONS
// ==========================================

router.post('/mark-attendance', checkAdmin, async (req, res) => {
    const attendanceData = req.body.attendance;
    const date = new Date().toISOString().split('T')[0];
    try {
        if (!attendanceData) return res.redirect('/admin/dashboard');
        const tasks = Object.entries(attendanceData).map(async ([studentId, status]) => {
            await Attendance.findOneAndUpdate({ student_id: studentId, date }, { status }, { upsert: true });
            return sendAttendanceEmail(studentId, status, date);
        });
        await Promise.all(tasks);
        res.send("<script>alert('Done!'); window.location='/admin/dashboard';</script>");
    } catch (err) { res.status(500).send("Error"); }
});

router.post('/upload-note', checkAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { title, class: className } = req.body;
        const students = await Student.find({ className });
        const notes = students.map(s => ({ student_id: s._id, title, file: req.file.filename }));
        await Notes.insertMany(notes);
        res.send("<script>alert('Uploaded!'); window.location='/admin/dashboard';</script>");
    } catch (err) { res.send("Error"); }
});

router.post('/delete-student/:id', checkAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) { res.send("Error"); }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
