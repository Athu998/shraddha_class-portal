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

// Transporter for email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'trycoding06@gmail.com',
    pass: 'fcusbcnwonkartjg' // Keep this secure via env variables in production
  }
});

// Helper: Attendance email function
async function sendAttendanceEmail(studentId, status, date) {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.email) return;

    const mailOptions = {
      from: '"Shraddha Classes ERP" <trycoding06@gmail.com>',
      to: student.email,
      subject: `Attendance Update - ${date}`,
      text: `Hello ${student.name},\n\nYour attendance for ${date} has been marked as: ${status}.\n\nShraddha Coaching Classes\nDeveloped and Maintained by Atharva Dhananjay More`
    };

    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error(`❌ Email failed for ${studentId}:`, err);
  }
}

// Multer Config
const uploadsDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Routes
router.get(['/login', '/admin-login'], (req, res) => res.sendFile(path.join(__dirname, '../public/admin-login.html')));

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await Admin.findOne({ username });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.send("❌ Invalid Credentials");
    }
    req.session.admin = { id: admin._id, username: admin.username };
    res.redirect('/admin/dashboard');
  } catch (err) {
    res.status(500).send("Login Error");
  }
});

// Dashboard with Preloader and Updated UI
router.get('/dashboard', async (req, res) => {
  if (!req.session.admin) return res.redirect('/admin/login');

  try {
    const students = await Student.find().sort({ name: 1 });
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard | Shraddha ERP</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
      <style>
        :root { --primary: #2b88f0; --success: #10b981; --danger: #ef4444; --dark: #1a202c; }
        body { font-family: 'Inter', sans-serif; background: #f1f5f9; margin: 0; min-height: 100vh; display: flex; flex-direction: column; }
        
        /* Preloader Styles */
        #preloader { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(255,255,255,0.9); z-index: 9999; display: none; flex-direction: column; justify-content: center; align-items: center; }
        .spinner { width: 50px; height: 50px; border: 5px solid #f3f3f3; border-top: 5px solid var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .container { max-width: 1100px; margin: 40px auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: #f8fafc; padding: 12px; text-align: left; color: #64748b; font-size: 0.8rem; text-transform: uppercase; }
        td { padding: 15px; border-bottom: 1px solid #f1f5f9; font-size: 0.95rem; }
        
        .btn { padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: 0.2s; text-decoration: none; display: inline-block; }
        .btn-primary { background: var(--primary); color: white; }
        .btn-success { background: var(--success); color: white; }
        .btn-danger { background: var(--danger); color: white; font-size: 0.85rem; }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .form-control { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #e2e8f0; border-radius: 6px; }
        
        /* Footer */
        footer { background: var(--dark); color: #94a3b8; padding: 40px 20px; margin-top: auto; }
        .footer-grid { max-width: 1100px; margin: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; }
        .footer-col h4 { color: white; margin-bottom: 15px; }
        .footer-col p { margin: 5px 0; font-size: 0.9rem; }
      </style>
    </head>
    <body>

    <div id="preloader">
        <div class="spinner"></div>
        <p style="margin-top: 15px; color: var(--primary); font-weight: 600;">Processing Request...</p>
    </div>

    <div class="container animate__animated animate__fadeIn">
        <div class="header">
            <h2 style="margin:0;">🎓 Shraddha ERP <small style="color:#94a3b8; font-weight:400;">| Admin</small></h2>
            <a href="/admin/logout" class="btn btn-danger">Log Out</a>
        </div>

        <form id="attendanceForm" method="POST" action="/admin/mark-attendance">
            <h3>✅ Student Attendance</h3>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Roll No</th>
                        <th>Mark Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(s => `
                    <tr>
                        <td style="color:#94a3b8;">#${s._id.toString().slice(-5)}</td>
                        <td><strong>${s.name}</strong></td>
                        <td>${s.roll || 'N/A'}</td>
                        <td>
                            <input type="radio" name="attendance[${s._id}]" value="Present" required> Pres
                            <input type="radio" name="attendance[${s._id}]" value="Absent" style="margin-left:10px;"> Abs
                        </td>
                        <td>
                             <button type="button" class="btn btn-danger" onclick="confirmDelete('${s._id}')">Delete</button>
                        </td>
                    </tr>`).join('')}
                </tbody>
            </table>
            <button type="submit" class="btn btn-success">📩 Submit & Notify via Email</button>
        </form>

        <hr style="margin: 40px 0; border: 0; border-top: 1px solid #f1f5f9;">

        <h3>📤 Upload Class Notes</h3>
        <form id="uploadForm" action="/admin/upload-note" method="POST" enctype="multipart/form-data">
            <input type="text" name="title" class="form-control" placeholder="Note Title (e.g. Algebra Part 1)" required>
            <select name="class" class="form-control" required>
                <option value="">-- Select Class --</option>
                ${[8,9,10,11,12].map(c => `<option value="${c}">Class ${c}</option>`).join('')}
            </select>
            <input type="file" name="pdf" class="form-control" accept="application/pdf" required>
            <button type="submit" class="btn btn-primary">📄 Upload & Distribute</button>
        </form>
    </div>

    <footer>
        <div class="footer-grid">
            <div class="footer-col">
                <h4>Shraddha Classes</h4>
                <p id="footer-time"></p>
                <p>© 2026 All Rights Reserved</p>
            </div>
            <div class="footer-col">
                <h4>Contact Support</h4>
                <p>📞 +91 7506420940</p>
                <p>📧 rushikeshsakpal2000@gmail.com</p>
            </div>
            <div class="footer-col">
                <h4>Location</h4>
                <p>📍 Sharanpur Road, Nashik</p>
                <p>Maharashtra, India - 422002</p>
            </div>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 0.8rem; border-top: 1px solid #334155; padding-top: 20px;">
            Developed by <strong>Atharva More</strong>
        </div>
    </footer>

    <script>
        // Preloader Logic
        const showLoader = () => document.getElementById('preloader').style.display = 'flex';
        document.getElementById('attendanceForm').onsubmit = showLoader;
        document.getElementById('uploadForm').onsubmit = showLoader;

        // Clock
        setInterval(() => {
            document.getElementById('footer-time').innerText = new Date().toLocaleString();
        }, 1000);

        function confirmDelete(id) {
            if(confirm('Permanently delete this student?')) {
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

// Post: Mark Attendance
router.post('/mark-attendance', async (req, res) => {
  const attendanceData = req.body.attendance;
  const date = new Date().toISOString().split('T')[0];

  if (!attendanceData) return res.redirect('/admin/dashboard');

  try {
    const tasks = Object.entries(attendanceData).map(async ([studentId, status]) => {
      await Attendance.findOneAndUpdate(
        { student_id: studentId, date },
        { status },
        { upsert: true }
      );
      return sendAttendanceEmail(studentId, status, date);
    });

    await Promise.all(tasks);
    res.send("<script>alert('Attendance updated and emails sent!'); window.location='/admin/dashboard';</script>");
  } catch (err) {
    res.status(500).send("Attendance Processing Error");
  }
});

// Post: Upload Notes
router.post('/upload-note', upload.single('pdf'), async (req, res) => {
  try {
    const { title, class: className } = req.body;
    const students = await Student.find({ className });

    if (!students.length) return res.send("❌ No students in this class found.");

    const noteEntries = students.map(s => ({
      student_id: s._id,
      title: title.trim(),
      file: req.file.filename
    }));

    await Notes.insertMany(noteEntries);
    res.send("<script>alert('Notes uploaded successfully!'); window.location='/admin/dashboard';</script>");
  } catch (err) {
    res.status(500).send("Upload Error");
  }
});

// Post: Delete Student
router.post('/delete-student/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    res.status(500).send("Delete Error");
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

module.exports = router;
