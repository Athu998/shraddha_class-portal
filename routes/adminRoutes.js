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
const Worksheet = require('../models/Worksheet'); // Included as per your previous versions

// ==========================================
// 🛡️ MIDDLEWARE & CONFIG
// ==========================================

// Auth Guard Middleware
const checkAdmin = (req, res, next) => {
    if (req.session.admin) return next();
    res.redirect('/admin/login');
};

// Email Configuration (Fixed for reliability)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "trycoding06@gmail.com",
        pass: "fcusbcnwonkartjg" // Ensure App Password is used
    },
    connectionTimeout: 10000
});

// Multer Storage for PDF Notes
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
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #2b88f0;">Attendance Notification</h2>
                    <p>Hello <strong>${student.name}</strong>,</p>
                    <p>Your attendance for <strong>${date}</strong> has been marked as: 
                       <span style="color: ${status === 'Present' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</span>.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #64748b;">Shraddha Coaching Classes, Nashik<br>Developed and Maintained by Atharva More</p>
                </div>
            `
        });
    } catch (err) {
        console.error(`❌ Email failed for ${studentId}:`, err.message);
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
            <title>Admin Dashboard | Shraddha ERP</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --primary: #2b88f0; --success: #10b981; --danger: #ef4444; --dark: #1e293b; --bg: #f8fafc; }
                body { background-color: var(--bg); font-family: 'Inter', sans-serif; color: #334155; }
                
                .card { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); background: #ffffff; }
                .table thead { background-color: #f1f5f9; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
                
                /* Custom Attendance Toggle Styles */
                .status-radio input { display: none; }
                .status-radio label { 
                    padding: 6px 16px; border-radius: 30px; cursor: pointer; border: 1px solid #e2e8f0; 
                    font-size: 0.85rem; transition: all 0.2s ease; font-weight: 500; color: #64748b;
                }
                .radio-p:checked + label { background: #dcfce7; color: #15803d; border-color: #10b981; }
                .radio-a:checked + label { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }

                /* Loader Overlay */
                #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.9); 
                          z-index:9999; display:none; flex-direction:column; justify-content:center; align-items:center; }
                
                footer { background: var(--dark); color: #94a3b8; padding: 40px 0; margin-top: 50px; }
            </style>
        </head>
        <body>

        <div id="loader">
            <div class="spinner-grow text-primary" role="status"></div>
            <p class="mt-3 fw-bold text-primary">Sending Student Notifications...</p>
        </div>

        <nav class="navbar navbar-expand-lg py-3 bg-white shadow-sm mb-4">
            <div class="container">
                <a class="navbar-brand fw-bold text-primary" href="#"><i class="fas fa-graduation-cap me-2"></i>SHRADDHA ERP</a>
                <div class="ms-auto d-flex align-items-center">
                    <span class="me-3 d-none d-md-inline">Welcome, <strong>${req.session.admin.username}</strong></span>
                    <a href="/admin/logout" class="btn btn-outline-danger btn-sm rounded-pill px-4">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold mb-0">Daily Attendance Control</h4>
                            <div class="text-muted small fw-bold"><i class="far fa-calendar-alt me-1"></i>${new Date().toDateString()}</div>
                        </div>
                        
                        <form id="attendanceForm" action="/admin/mark-attendance" method="POST">
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Roll / Class</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${students.map(s => `
                                        <tr>
                                            <td>
                                                <div class="fw-bold text-dark">${s.name}</div>
                                                <div class="text-muted" style="font-size:0.75rem;">${s.email || 'No Email Linked'}</div>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">Roll: ${s.roll || 'N/A'}</span>
                                            </td>
                                            <td class="text-center">
                                                <div class="status-radio d-flex justify-content-center gap-2">
                                                    <input type="radio" id="p-${s._id}" name="attendance[${s._id}]" value="Present" class="radio-p" required>
                                                    <label for="p-${s._id}">Present</label>
                                                    
                                                    <input type="radio" id="a-${s._id}" name="attendance[${s._id}]" value="Absent" class="radio-a">
                                                    <label for="a-${s._id}">Absent</label>
                                                </div>
                                            </td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="confirmDelete('${s._id}', '${s.name}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-end mt-4">
                                <button type="submit" class="btn btn-primary px-5 py-2 rounded-pill fw-bold shadow">
                                    <i class="fas fa-paper-plane me-2"></i>Mark & Notify All
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="col-lg-6 mx-auto">
                    <div class="card p-4 bg-primary text-white shadow-lg">
                        <h5 class="fw-bold mb-3"><i class="fas fa-file-upload me-2"></i>Distribute Study Notes</h5>
                        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
                            <div class="mb-3">
                                <input type="text" name="title" class="form-control border-0 shadow-sm" placeholder="Title (e.g. Maths Chapter 1)" required>
                            </div>
                            <div class="mb-3">
                                <select name="class" class="form-select border-0 shadow-sm" required>
                                    <option value="">-- Target Class --</option>
                                    ${[8, 9, 10, 11, 12].map(c => `<option value="${c}">Class ${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <input type="file" name="pdf" class="form-control border-0 shadow-sm" accept="application/pdf" required>
                            </div>
                            <button class="btn btn-light w-100 fw-bold text-primary py-2 rounded-pill">Upload PDF</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <div class="container text-center">
                <h5 class="text-white fw-bold">Shraddha Coaching Classes</h5>
                <p class="small mb-1"><i class="fas fa-map-marker-alt me-2"></i>Sharanpur Road, Nashik | <i class="fas fa-phone me-2"></i>+91 7506420940</p>
                <p class="small text-secondary mt-3">© 2026 ERP System | Developed by Atharva More</p>
            </div>
        </footer>

        <script>
            // Preloader for long tasks
            document.getElementById('attendanceForm').onsubmit = () => {
                document.getElementById('loader').style.display = 'flex';
            };

            // Confirmation for deletion
            function confirmDelete(id, name) {
                if(confirm('Permanently remove ' + name + ' from the system?')) {
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
        res.status(500).send("Dashboard Load Error");
    }
});

// ==========================================
// ⚙️ POST ACTIONS
// ==========================================

// Mark Attendance
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
        res.send("<script>alert('Attendance record updated and students notified!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.status(500).send("Attendance Error");
    }
});

// Upload Notes
router.post('/upload-note', checkAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { title, class: className } = req.body;
        const students = await Student.find({ className });

        if (!students.length) return res.send("<script>alert('No students found for this class!'); window.location='/admin/dashboard';</script>");

        const notes = students.map(s => ({
            student_id: s._id,
            title: title.trim(),
            file: req.file.filename
        }));

        await Notes.insertMany(notes);
        res.send("<script>alert('Notes distributed successfully!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.send("Upload Error");
    }
});

// Delete Student
router.post('/delete-student/:id', checkAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Delete Failed");
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;const express = require('express');
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
const Worksheet = require('../models/Worksheet'); // Included as per your previous versions

// ==========================================
// 🛡️ MIDDLEWARE & CONFIG
// ==========================================

// Auth Guard Middleware
const checkAdmin = (req, res, next) => {
    if (req.session.admin) return next();
    res.redirect('/admin/login');
};

// Email Configuration (Fixed for reliability)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "trycoding06@gmail.com",
        pass: "fcusbcnwonkartjg" // Ensure App Password is used
    },
    connectionTimeout: 10000
});

// Multer Storage for PDF Notes
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
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #2b88f0;">Attendance Notification</h2>
                    <p>Hello <strong>${student.name}</strong>,</p>
                    <p>Your attendance for <strong>${date}</strong> has been marked as: 
                       <span style="color: ${status === 'Present' ? '#10b981' : '#ef4444'}; font-weight: bold;">${status}</span>.
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                    <p style="font-size: 12px; color: #64748b;">Shraddha Coaching Classes, Nashik<br>Developed and Maintained by Atharva More</p>
                </div>
            `
        });
    } catch (err) {
        console.error(`❌ Email failed for ${studentId}:`, err.message);
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
            <title>Admin Dashboard | Shraddha ERP</title>
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
            <style>
                :root { --primary: #2b88f0; --success: #10b981; --danger: #ef4444; --dark: #1e293b; --bg: #f8fafc; }
                body { background-color: var(--bg); font-family: 'Inter', sans-serif; color: #334155; }
                
                .card { border: none; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.04); background: #ffffff; }
                .table thead { background-color: #f1f5f9; color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; }
                
                /* Custom Attendance Toggle Styles */
                .status-radio input { display: none; }
                .status-radio label { 
                    padding: 6px 16px; border-radius: 30px; cursor: pointer; border: 1px solid #e2e8f0; 
                    font-size: 0.85rem; transition: all 0.2s ease; font-weight: 500; color: #64748b;
                }
                .radio-p:checked + label { background: #dcfce7; color: #15803d; border-color: #10b981; }
                .radio-a:checked + label { background: #fee2e2; color: #b91c1c; border-color: #ef4444; }

                /* Loader Overlay */
                #loader { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(255,255,255,0.9); 
                          z-index:9999; display:none; flex-direction:column; justify-content:center; align-items:center; }
                
                footer { background: var(--dark); color: #94a3b8; padding: 40px 0; margin-top: 50px; }
            </style>
        </head>
        <body>

        <div id="loader">
            <div class="spinner-grow text-primary" role="status"></div>
            <p class="mt-3 fw-bold text-primary">Sending Student Notifications...</p>
        </div>

        <nav class="navbar navbar-expand-lg py-3 bg-white shadow-sm mb-4">
            <div class="container">
                <a class="navbar-brand fw-bold text-primary" href="#"><i class="fas fa-graduation-cap me-2"></i>SHRADDHA ERP</a>
                <div class="ms-auto d-flex align-items-center">
                    <span class="me-3 d-none d-md-inline">Welcome, <strong>${req.session.admin.username}</strong></span>
                    <a href="/admin/logout" class="btn btn-outline-danger btn-sm rounded-pill px-4">Logout</a>
                </div>
            </div>
        </nav>

        <div class="container">
            <div class="row">
                <div class="col-lg-12">
                    <div class="card p-4 mb-4">
                        <div class="d-flex justify-content-between align-items-center mb-4">
                            <h4 class="fw-bold mb-0">Daily Attendance Control</h4>
                            <div class="text-muted small fw-bold"><i class="far fa-calendar-alt me-1"></i>${new Date().toDateString()}</div>
                        </div>
                        
                        <form id="attendanceForm" action="/admin/mark-attendance" method="POST">
                            <div class="table-responsive">
                                <table class="table align-middle">
                                    <thead>
                                        <tr>
                                            <th>Student</th>
                                            <th>Roll / Class</th>
                                            <th class="text-center">Status</th>
                                            <th class="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${students.map(s => `
                                        <tr>
                                            <td>
                                                <div class="fw-bold text-dark">${s.name}</div>
                                                <div class="text-muted" style="font-size:0.75rem;">${s.email || 'No Email Linked'}</div>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">Roll: ${s.roll || 'N/A'}</span>
                                            </td>
                                            <td class="text-center">
                                                <div class="status-radio d-flex justify-content-center gap-2">
                                                    <input type="radio" id="p-${s._id}" name="attendance[${s._id}]" value="Present" class="radio-p" required>
                                                    <label for="p-${s._id}">Present</label>
                                                    
                                                    <input type="radio" id="a-${s._id}" name="attendance[${s._id}]" value="Absent" class="radio-a">
                                                    <label for="a-${s._id}">Absent</label>
                                                </div>
                                            </td>
                                            <td class="text-center">
                                                <button type="button" class="btn btn-sm btn-outline-danger border-0" onclick="confirmDelete('${s._id}', '${s.name}')">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-end mt-4">
                                <button type="submit" class="btn btn-primary px-5 py-2 rounded-pill fw-bold shadow">
                                    <i class="fas fa-paper-plane me-2"></i>Mark & Notify All
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="col-lg-6 mx-auto">
                    <div class="card p-4 bg-primary text-white shadow-lg">
                        <h5 class="fw-bold mb-3"><i class="fas fa-file-upload me-2"></i>Distribute Study Notes</h5>
                        <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
                            <div class="mb-3">
                                <input type="text" name="title" class="form-control border-0 shadow-sm" placeholder="Title (e.g. Maths Chapter 1)" required>
                            </div>
                            <div class="mb-3">
                                <select name="class" class="form-select border-0 shadow-sm" required>
                                    <option value="">-- Target Class --</option>
                                    ${[8, 9, 10, 11, 12].map(c => `<option value="${c}">Class ${c}</option>`).join('')}
                                </select>
                            </div>
                            <div class="mb-3">
                                <input type="file" name="pdf" class="form-control border-0 shadow-sm" accept="application/pdf" required>
                            </div>
                            <button class="btn btn-light w-100 fw-bold text-primary py-2 rounded-pill">Upload PDF</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <footer>
            <div class="container text-center">
                <h5 class="text-white fw-bold">Shraddha Coaching Classes</h5>
                <p class="small mb-1"><i class="fas fa-map-marker-alt me-2"></i>Sharanpur Road, Nashik | <i class="fas fa-phone me-2"></i>+91 7506420940</p>
                <p class="small text-secondary mt-3">© 2026 ERP System | Developed by Atharva More</p>
            </div>
        </footer>

        <script>
            // Preloader for long tasks
            document.getElementById('attendanceForm').onsubmit = () => {
                document.getElementById('loader').style.display = 'flex';
            };

            // Confirmation for deletion
            function confirmDelete(id, name) {
                if(confirm('Permanently remove ' + name + ' from the system?')) {
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
        res.status(500).send("Dashboard Load Error");
    }
});

// ==========================================
// ⚙️ POST ACTIONS
// ==========================================

// Mark Attendance
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
        res.send("<script>alert('Attendance record updated and students notified!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.status(500).send("Attendance Error");
    }
});

// Upload Notes
router.post('/upload-note', checkAdmin, upload.single('pdf'), async (req, res) => {
    try {
        const { title, class: className } = req.body;
        const students = await Student.find({ className });

        if (!students.length) return res.send("<script>alert('No students found for this class!'); window.location='/admin/dashboard';</script>");

        const notes = students.map(s => ({
            student_id: s._id,
            title: title.trim(),
            file: req.file.filename
        }));

        await Notes.insertMany(notes);
        res.send("<script>alert('Notes distributed successfully!'); window.location='/admin/dashboard';</script>");
    } catch (err) {
        res.send("Upload Error");
    }
});

// Delete Student
router.post('/delete-student/:id', checkAdmin, async (req, res) => {
    try {
        await Student.findByIdAndDelete(req.params.id);
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.status(500).send("Delete Failed");
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
