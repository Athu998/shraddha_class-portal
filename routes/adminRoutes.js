// === File: routes/admin.js ===
const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const multer = require('multer');

const Worksheet = require('../models/Worksheet');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');

// Serve static files
router.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Transporter for email
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'trycoding06@gmail.com',
    pass: 'fcusbcnwonkartjg' // Note: Use an App Password here
  }
});

// Attendance email function
async function sendAttendanceEmail(studentId, status, date) {
  try {
    const student = await Student.findById(studentId);
    if (!student || !student.email) {
        console.log(`⚠️ Skipped email for ID ${studentId} - No email found.`);
        return;
    }

    const mailOptions = {
      from: '"Shraddha Classes ERP" <trycoding06@gmail.com>',
      to: student.email,
      subject: 'Attendance Notification',
      text: `Hello ${student.name},\n\nYour attendance for ${date} is marked as: ${status}.\n\nIn Shraddha Coaching Classes\nThank you!\nDeveloped and Maintained by Atharva Dhananjay More`
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${student.email}`);
  } catch (err) {
    console.error(`❌ Email sending failed for ID ${studentId}:`, err);
  }
}

// Multer setup
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

// Admin login routes
router.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, '../public/admin-login.html')));
router.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/admin-login.html')));
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

// Dashboard route (UPDATED UI & FOOTER)
router.get('/dashboard', async (req, res) => {
  if (!req.session.admin) return res.send("Unauthorized");

  try {
    const students = await Student.find();
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Admin Dashboard | Shraddha Classes ERP</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { 
            font-family: 'Inter', sans-serif; 
            background: linear-gradient(135deg, #2b88f0 0%, #1cb5e0 100%); 
            margin: 0; 
            display: flex; 
            flex-direction: column; 
            min-height: 100vh;
            color: #333;
        }
        .main-wrapper {
            flex: 1;
            padding: 40px 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: auto; 
            background: #ffffff; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); 
            animation: fadeInUp 0.6s ease-in-out; 
        }
        h2, h3 { color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; border-radius: 8px; overflow: hidden; }
        th, td { padding: 15px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background-color: #f8fafc; color: #475569; font-weight: 600; text-transform: uppercase; font-size: 0.85rem; }
        tr:hover { background-color: #f1f5f9; }
        
        /* Buttons */
        .btn { padding: 10px 20px; font-size: 15px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; transition: all 0.3s; }
        .btn-primary { background-color: #2b88f0; color: white; }
        .btn-primary:hover { background-color: #1a6ac9; box-shadow: 0 4px 10px rgba(43,136,240,0.3); }
        .btn-success { background-color: #10b981; color: white; margin-top: 20px; }
        .btn-success:hover { background-color: #059669; }
        .btn-danger { background-color: #ef4444; color: white; padding: 6px 12px; font-size: 14px; }
        .btn-danger:hover { background-color: #dc2626; }
        
        .header-flex { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 30px; }
        .form-control { width: 100%; padding: 12px; margin: 10px 0 20px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box; font-family: 'Inter', sans-serif; }
        
        /* Footer Styles */
        .custom-footer { 
            background-color: #1a202c; 
            color: #cbd5e1; 
            padding: 40px 5%; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            flex-wrap: wrap; 
            font-size: 0.9rem;
            box-shadow: 0 -5px 20px rgba(0,0,0,0.1);
        }
        .footer-col { flex: 1; min-width: 250px; margin: 10px 0; }
        .footer-col.center { text-align: center; }
        .footer-col.right { text-align: right; }
        
        #datetime { font-size: 1.1rem; font-weight: 500; color: #f8fafc; margin-bottom: 15px; }
        
        .footer-links a { 
            display: inline-block; 
            color: #94a3b8; 
            text-decoration: none; 
            border: 1px solid #334155; 
            padding: 6px 12px; 
            margin: 4px 4px 4px 0; 
            border-radius: 4px; 
            transition: 0.3s; 
            font-size: 0.85rem;
        }
        .footer-links a:hover { background: #2b88f0; color: #fff; border-color: #2b88f0; }
        .dev-credit { margin-top: 20px; color: #94a3b8; }
        .dev-credit a { color: #38bdf8; text-decoration: none; }
        
        .contact-info p { margin: 8px 0; }
        .map-wrapper iframe { border-radius: 8px; width: 100%; max-width: 320px; height: 130px; border: none; }

        @media(max-width: 768px) {
            .custom-footer { flex-direction: column; text-align: center; }
            .footer-col { text-align: center !important; margin-bottom: 20px; }
            .map-wrapper iframe { max-width: 100%; }
        }
      </style>
    </head>
    <body>
    
    <div class="main-wrapper">
        <div class="container animate__animated animate__fadeInUp">
          <div class="header-flex">
            <h2>🎓 Shraddha Classes ERP <span style="font-weight:300; color:#64748b;">| Admin</span></h2>
            <form action="/admin/logout" method="GET" style="margin:0;">
              <button type="submit" class="btn btn-danger" style="padding: 10px 20px; font-size: 15px;">🔓 Logout</button>
            </form>
          </div>

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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
    `;

    students.forEach(student => {
      html += `
                <tr>
                  <td style="color:#64748b; font-weight:500;">#${student._id.toString().slice(-5)}</td>
                  <td style="font-weight: 500;">${student.name}</td>
                  <td>${student.email || '-'}</td>
                  <td>${student.roll || '-'}</td>
                  <td>
                    <label style="margin-right:10px; cursor:pointer;"><input type="radio" name="attendance[${student._id}]" value="Present" required> Present</label>
                    <label style="cursor:pointer;"><input type="radio" name="attendance[${student._id}]" value="Absent"> Absent</label>
                  </td>
                  <td>
                    <form method="POST" action="/admin/delete-student/${student._id}" style="display:inline;" onsubmit="return confirm('Are you sure you want to delete ${student.name}?');">
                      <button type="submit" class="btn btn-danger">Delete</button>
                    </form>
                  </td>
                </tr>
      `;
    });

    html += `
              </tbody>
            </table>
            <button type="submit" class="btn btn-success">📩 Submit Attendance</button>
          </form>
          
          <hr style="border: 1px solid #f1f5f9; margin: 40px 0;">

          <h3>📤 Upload Notes PDF</h3>
          <form action="/admin/upload-note" method="POST" enctype="multipart/form-data">
            <label style="font-weight:500;">Note Title:</label>
            <input type="text" name="title" class="form-control" placeholder="e.g., Chapter 1 Physics" required>
            
            <label style="font-weight:500;">Select Class:</label>
            <select name="class" class="form-control" required>
              <option value="">-- Select Class --</option>
              ${[...Array(12)].map((_, i) => `<option value="${i + 1}">Class ${i + 1}</option>`).join('')}
            </select>
            
            <label style="font-weight:500;">Upload PDF:</label>
            <input type="file" name="pdf" class="form-control" accept="application/pdf" style="padding: 9px;" required>
            
            <button type="submit" class="btn btn-primary">📄 Upload Note</button>
          </form>
        </div>
    </div>

    <footer class="custom-footer">
      <div class="footer-col">
        <div id="datetime">Loading time...</div>
        <div class="footer-links">
          <a href="#">Home</a>
          <a href="#">About Us</a>
          <a href="#">Contact</a>
          <a href="#">FAQ</a>
          <a href="#">Privacy Policy</a>
        </div>
        <div class="dev-credit">
          Developed by <strong>Atharva More</strong> | <a href="https://linkedin.com/in/your-profile" target="_blank">LinkedIn</a>
        </div>
      </div>
      
      <div class="footer-col center contact-info">
        <p>📧 info@shraddhaerp.com</p>
        <p>📧 atharvainagar@gmail.com</p>
        <p>📞 +91 98255677</p>
        <p>📍 Shivajinagar, Pune 411005</p>
      </div>

      <div class="footer-col right map-wrapper">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d121059.0344739699!2d73.86296739999999!3d18.520430299999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2bf2e67461101%3A0x828d43bf9d9ee343!2sPune%2C%20Maharashtra!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin" 
          allowfullscreen="" 
          loading="lazy" 
          referrerpolicy="no-referrer-when-downgrade">
        </iframe>
      </div>
    </footer>

    <script>
      // Live clock for footer
      setInterval(() => {
        const now = new Date();
        document.getElementById('datetime').innerText = now.toLocaleString('en-US');
      }, 1000);
    </script>
    </body>
    </html>
    `;

    res.send(html); 
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).send("Error loading dashboard");
  }
});

// Attendance submission
router.post('/mark-attendance', async (req, res) => {
  const attendanceData = req.body.attendance;
  const date = new Date().toISOString().split('T')[0];

  if (!attendanceData) {
      return res.status(400).send("❌ No attendance data submitted. <br><a href='/admin/dashboard'>Back to Dashboard</a>");
  }

  try {
    const emailPromises = [];

    for (const studentId in attendanceData) {
      const status = attendanceData[studentId];

      const existing = await Attendance.findOne({ student_id: studentId, date });
      if (!existing) {
        await Attendance.create({ student_id: studentId, status, date });
      }

      emailPromises.push(sendAttendanceEmail(studentId, status, date));
    }

    await Promise.all(emailPromises);

    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: #10b981;">✅ Attendance marked and emails sent!</h2>
        <a href="/admin/dashboard" style="padding: 10px 20px; background: #2b88f0; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">Back to Dashboard</a>
      </div>
    `);
  } catch (err) {
    console.error("Mark attendance error:", err);
    res.status(500).send("Error saving attendance");
  }
});

// Upload notes route
router.post('/upload-note', upload.single('pdf'), async (req, res) => {
  try {
    const { title = '', class: className = '' } = req.body;
    const file = req.file;

    if (!file || !title.trim() || !className.trim()) {
      return res.status(400).send("❌ All fields are required and file must be uploaded.");
    }

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
      <div style="text-align: center; font-family: sans-serif; margin-top: 50px;">
        <h2 style="color: #10b981;">✅ Notes uploaded for ${students.length} students in class ${className}!</h2>
        <a href="/admin/dashboard" style="text-decoration: none; background-color: #2b88f0; padding: 10px 20px; color: white; border-radius: 5px; display: inline-block; margin-top: 15px;">Back to Dashboard</a>
      </div>
    `);
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).send("❌ Server error while uploading.");
  }
});

// DELETE Student Route
router.post('/delete-student/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect('/admin/dashboard');
  } catch (err) {
    console.error("❌ Error deleting student:", err);
    res.status(500).send("❌ Server error while deleting student");
  }
});

// Logout route
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.send("<div style='font-family: sans-serif; text-align: center; margin-top: 50px;'><h2>🔓 Admin logged out.</h2><a href='/admin/login' style='padding: 10px 20px; background: #2b88f0; color: #fff; text-decoration: none; border-radius: 5px; display: inline-block;'>Login again</a></div>");
  });
});

module.exports = router;
