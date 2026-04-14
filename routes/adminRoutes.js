const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');

const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');

// ==========================================
// 🛡️ MIDDLEWARE & CONFIG
// ==========================================

// Check if admin is logged in
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
                    <p>Your attendance for <strong>${date}</strong> has been marked as: 
                       <span style="color: ${status === 'Present' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</span>.
                    </p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">Shraddha Coaching Classes, Nashik<br>Developed by Atharva More</p>
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
// 📊 DASHBOARD (PRO DESIGN)
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
            <title>Admin Portal | Shraddha ERP</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --glass: rgba(255, 255, 255, 0.9); --primary: #2b88f0; --bg: #f0f4f8; }
                body { background-color: var(--bg); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; }
                
                .navbar { background: #fff; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
                .card { border: none; border-radius: 15px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); background: var(--glass); }
                
                .table thead { background-color: #f8fafc; color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.5px; }
                .table-hover tbody tr:hover { background-color: #f1f5f9; transition: 0.3s; }
                
                .status-radio input { display: none; }
                .status-radio label { 
                    padding: 5px 15px; border-radius: 20px; cursor: pointer; border: 1px solid #e2e8f0; 
                    font-size: 0.85rem; transition: 0.2s; font-weight: 500;
                }
                .radio-p:checked + label { background: #dcfce7; color: #15803d; border-color: #10b981; }
                .radio-a:checked + label { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }

                .footer { background: #1e293b; color: #94a3b8; padding: 50px 0 20px; margin-top: 60px; }
                .footer h5 { color: #fff; font-weight: 600; }
                .footer-link { color: #94a3b8; text-decoration: none; transition: 0.3s; }
                .footer-link:hover { color: var(--primary); }

                #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.8); 
                          z-index:9999; display:none; flex-direction:column; justify-content:center; align-items:center; }
            </style>
        </head>
        <body>

        <div id="loader"><div class="spinner-border text-primary"></div><p class="mt-2">Sending notifications...</p></div>

        <nav class="navbar navbar-expand-lg py-3 mb-4">
            <div class="container">
                <a class="navbar-brand fw-bold text-primary" href="#"><i class="fas fa-graduation-cap me-2"></i>SHRADDHA ERP</a>
                <div class="ms-auto">
                    <span class="me-3 text-muted">Welcome, <strong>${req.session.admin.username}</strong></span>
                    <a href="/admin/logout" class="btn btn-outline-danger btn-sm rounded-pill px-3">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container">
            <div class="row">
                <div class="col-lg-8">
                    <div class="card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="mb-0 fw-bold">Daily Attendance</h4>
                            <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">${new Date().toDateString()}</span>
                        </div>
                        
                        <form id="attendanceForm" action="/admin/mark-attendance" method="POST">
                            <div class="table-responsive">
                                <table class="table table-hover align-middle">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Details</th>
                                            <th class="text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${students.map(s => `
                                        <tr>
                                            <td>
                                                <div class="fw-bold text-dark">${s.name}</div>
                                                <small class="text-muted">ID: #${s._id.toString().slice(-5)}</small>
                                            </td>
                                            <td>
                                                <div class="small"><i class="fas fa-envelope me-1 text-muted"></i>${s.email || 'No Email'}</div>
                                                <div class="small"><i class="fas fa-id-card me-1 text-muted"></i>Roll: ${s.roll || 'N/A'}</div>
                                            </td>
                                            <td class="text-center">
                                                <div class="status-radio d-flex justify-content-center gap-2">
                                                    <input type="radio" id="p-${s._id}" name="attendance[${s._id}]" value="Present" class="radio-p" required>
                                                    <label for="p-${s._id}">Present</label>
                                                    
                                                    <input type="radio" id="a-${s._id}" name="attendance[${s._id}]" value="Absent" class="radio-a">
                                                    <label for="a-${s._id}">Absent</label>
                                                </div>
                                            </td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <button type="submit" class="btn btn-primary w-100 mt-3 py-3 rounded-pill fw-bold shadow-sm">
                                <i class="fas fa-paper-plane me-2"></i>Submit & Notify Students
                            </button>
                        </form>
                    </div>
                </div>

                <div class="col-lg-4">
                    <div class="card p-4 mb-4 bg-primary text-white">
                        <h5 class="fw-bold mb-3">Upload Class Notes</h5>
                        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
                            <input type="text" name="title" class="form-control mb-3 bg-white border-0" placeholder="Chapter Title" required>
                            <select name="class" class="form-select mb-3 border-0" required>
                                <option value="">Target Class</option>
                                ${[8, 9, 10, 11, 12].map(c => `<option value="${c}">Class ${c}</option>`).join('')}
                            </select>
                            <input type="file" name="pdf" class="form-control mb-3 border-0" accept="application/pdf" required>
                            <button class="btn btn-light w-100 fw-bold text-primary">Upload PDF</button>
                        </form>
                    </div>

                    <div class="card p-4">
                        <h5 class="fw-bold mb-3">Quick Links</h5>
                        <ul class="list-unstyled mb-0">
                            <li class="mb-2"><a href="#" class="footer-link"><i class="fas fa-user-plus me-2"></i>Add New Student</a></li>
                            <li class="mb-2"><a href="#" class="footer-link"><i class="fas fa-file-invoice me-2"></i>Generate Reports</a></li>
                            <li><a href="#" class="footer-link text-danger"><i class="fas fa-trash me-2"></i>Clear Records</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <footer class="footer mt-auto">
            <div class="container">
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <h5 class="mb-3">Shraddha Classes</h5>
                        <p class="small">Providing quality education and digital tracking for students in Maharashtra since 2010.</p>
                        <div id="clock" class="fw-bold text-primary"></div>
                    </div>
                    <div class="col-md-4 mb-4">
                        <h5 class="mb-3">Contact Support</h5>
                        <p class="small mb-1"><i class="fas fa-phone me-2"></i>+91 7506420940</p>
                        <p class="small mb-1"><i class="fas fa-envelope me-2"></i>rushikeshsakpal2000@gmail.com</p>
                        <p class="small"><i class="fas fa-map-marker-alt me-2"></i>Sharanpur Road, Nashik 422002</p>
                    </div>
                    <div class="col-md-4 mb-4 text-md-end">
                        <h5 class="mb-3">System</h5>
                        <p class="small">Version 3.2.0 (Stable)</p>
                        <p class="small">Maintained by <strong>Atharva More</strong></p>
                    </div>
                </div>
                <hr class="border-secondary">
                <p class="text-center small mb-0">© 2026 Shraddha ERP. All Rights Reserved.</p>
            </div>
        </footer>

        <script>
            document.getElementById('attendanceForm').onsubmit = () => {
                document.getElementById('loader').style.display = 'flex';
            };
            
            setInterval(() => {
                document.getElementById('clock').innerText = new Date().toLocaleString();
            }, 1000);
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
// ⚙️ ACTIONS
// ==========================================

router.post('/mark-attendance', checkAdmin, async (req, res) => {
    const attendanceData = req.body.attendance;
    const date = new Date().toISOString().split('T')[0];

    try {
        if (!attendanceData) return res.redirect('/admin/dashboard');

        const tasks = Object.entries(attendanceData).map(async ([studentId, status]) => {
            await Attendance.findOneAndUpdate(
                { student_id: studentId, date },
                { status },
                { upsert: true }
            );
            return sendAttendanceEmail(studentId, status, date);
        });

        await Promise.all(tasks);
        res.send("<script>alert('Attendance & Emails successfully processed!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.status(500).send("Processing Error");
    }
});

router.post('/upload-note', checkAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { title, class: className } = req.body;
        const students = await Student.find({ className });

        if (!students.length) return res.send("<script>alert('No students found in this class!'); window.location='/admin/dashboard';</script>");

        const notes = students.map(s => ({
            student_id: s._id,
            title,
            file: req.file.filename
        }));

        await Notes.insertMany(notes);
        res.send("<script>alert('Notes uploaded successfully!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.send("Upload Failed");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
