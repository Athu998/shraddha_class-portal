// routes/studentRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const path = require('path');
const nodemailer = require('nodemailer');



const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Notes = require('../models/Notes');
const Worksheet = require('../models/Worksheet');

router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


router.get('/login-form', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login-form.html'));
});


router.get('/register-form', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register.html'));
});


router.post('/register', async (req, res) => {
    const { name, dob, school_name, last_year_marks, parent_contact, address, email, password, class: className } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newStudent = new Student({
            name,
    dob,
    school_name,
    last_year_marks,
    parent_contact,
    address,
    email,
    password: hashedPassword,  
    class: className
        });

        await newStudent.save();

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'trycoding06@gmail.com',
                pass: 'fcusbcnwonkartjg'
            }
        });

        const mailOptions = {
            from: 'trycoding06@gmail.com',
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name},\n\nYour registration was successful with Shraddha  Coaching Classes.\nThank you! \n Devloped and Mainted by \n Atharva Dhananjay More`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) console.error("Email error:", err);
            else console.log("Email sent:", info.response);
        });

        res.send(`<h2>✅ Registered Successfully!</h2><a href="/students/login-form">Login here</a>`);
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).send("Server error during registration");
    }
});


router.post('/login', async (req, res) => {
    const { name, password } = req.body;

    try {
        const student = await Student.findOne({ name });
        if (!student) return res.send('❌ Student not found');

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) return res.send('❌ Incorrect password');

        req.session.student = {
            id: student._id,
            name: student.name
        };

        res.redirect(`/students/dashboard`);
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).send("Login error");
    }
});


router.get('/dashboard', async (req, res) => {
    if (!req.session.student) return res.send("Unauthorized");

    try {
        const student = await Student.findById(req.session.student.id);
        if (!student) return res.send("Student not found");

        const attendanceRecords = await Attendance.find({ student_id: student._id }).sort({ date: -1 });
        const notes = await Notes.find({ student_id: student._id }).sort({ uploaded_at: -1 });
        const worksheets = await Worksheet.find().sort({ uploaded_at: -1 });

        console.log("Fetched notes for student:", student._id, notes); // Debug line

        const total_days = attendanceRecords.length;
        const present_days = attendanceRecords.filter(a => a.status === 'Present').length;
        const absent_days = total_days - present_days;

        const summaryHTML = `
            <h2>📊 Attendance Summary</h2>
            <ul>
                <li><strong>Total Days:</strong> ${total_days}</li>
                <li><strong>Present:</strong> ✅ ${present_days}</li>
                <li><strong>Absent:</strong> ❌ ${absent_days}</li>
            </ul>
        `;

        let attendanceHTML = `
            <h3>📅 Attendance Details</h3>
            <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
                <tr style="background-color: #f2f2f2;">
                    <th>Date</th>
                    <th>Status</th>
                </tr>
        `;

        attendanceRecords.forEach(record => {
            const formattedDate = new Date(record.date).toISOString().split('T')[0];
            attendanceHTML += `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${record.status === 'Present' ? '✅ Present' : '❌ Absent'}</td>
                </tr>
            `;
        });

        attendanceHTML += `</table>`;

        let notesHTML = `<h3>📘 Notes</h3>`;
        if (notes.length === 0) {
            notesHTML += `<p>No notes available.</p>`;
        } else {
            notesHTML += `<ul>`;
            notes.forEach(note => {
                notesHTML += `
                    <li>
                        <strong>${note.title}</strong>:
                        <a href="/uploads/${note.file}" target="_blank">📄 View PDF</a>
                    </li>
                `;
            });
            notesHTML += `</ul>`;
        }

        let worksheetHTML = `<h3>📝 Worksheets</h3>`;
        if (worksheets.length === 0) {
            worksheetHTML += `<p>No worksheets available.</p>`;
        } else {
            worksheetHTML += `<ul>`;
            worksheets.forEach(ws => {
                worksheetHTML += `
                    <li>
                        <strong>${ws.title}</strong>:
                        <a href="/uploads/${ws.file}" target="_blank">📄 View PDF</a>
                    </li>
                `;
            });
            worksheetHTML += `</ul>`;
        }

        res.send(`
            <h1>Welcome, ${student.name}!</h1>
            <p><strong>Student ID:</strong> ${student._id}</p>
            <p><strong>Date of Birth:</strong> ${student.dob}</p>
            <p><strong>School Name:</strong> ${student.school_name}</p>
            <p><strong>Last Year Marks:</strong> ${student.last_year_marks}</p>
            <p><strong>Parent Contact:</strong> ${student.parent_contact}</p>
            <p><strong>Address:</strong> ${student.address}</p>
            <p><strong>Email:</strong> ${student.email}</p>

            <a href="/students/edit-profile">
                <button style="padding: 8px 12px; background-color: #4CAF50; color: white; border: none; cursor: pointer;">Update Profile</button>
            </a>

            <form method="POST" action="/students/delete-account" onsubmit="return confirm('Are you sure?');">
                <button style="margin-top: 10px; padding: 8px 12px; background-color: #e53935; color: white; border: none; cursor: pointer;">Delete Account</button>
            </form>

            <hr>
            ${summaryHTML}
            ${attendanceHTML}
            ${notesHTML}
            ${worksheetHTML}

            <br><a href="/students/logout">Logout</a>
        `);
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Server error");
    }
});


router.get('/edit-profile', async (req, res) => {
    if (!req.session.student) return res.send("Unauthorized");
    res.sendFile(path.join(__dirname, '../public/edit-profile.html'));
});

// POST update profile
router.post('/update-profile', async (req, res) => {
    if (!req.session.student) return res.send("Unauthorized");

    const { name, dob, school_name, last_year_marks, parent_contact, address, email } = req.body;

    try {
        await Student.findByIdAndUpdate(req.session.student.id, {
            name,
            dob,
            school_name,
            last_year_marks,
            parent_contact,
            address,
            email
        });

        req.session.student.name = name;
        res.send(`<h2>✅ Profile Updated Successfully!</h2><a href="/students/dashboard">Back to Dashboard</a>`);
    } catch (err) {
        console.error("Update error:", err);
        res.status(500).send("Database update error");
    }
});

router.post('/delete-account', async (req, res) => {
    if (!req.session.student) return res.send("Unauthorized");

    try {
        await Student.findByIdAndDelete(req.session.student.id);
        req.session.destroy(() => {
            res.send('<h2>🗑️ Account Deleted</h2><a href="/students/register-form">Register again</a>');
        });
    } catch (err) {
        console.error("Delete error:", err);
        res.status(500).send("Failed to delete account");
    }
});

router.get('/worksheets', async (req, res) => {
    const student = await Student.findById(req.session.student?.id);
    if (!student) return res.send("Unauthorized");

    try {
        const worksheets = await Worksheet.find({ class: student.class });

        let html = `<h2>📘 Worksheets for Class ${student.class}</h2><ul>`;
        worksheets.forEach(ws => {
            html += `<li>${ws.title} - <a href="/uploads/${ws.file}" target="_blank">Download</a></li>`;
        });
        html += '</ul><a href="/student/dashboard">🔙 Back</a>';

        res.send(html);
    } catch (err) {
        console.error("❌ Worksheet fetch error:", err);
        res.status(500).send("Error loading worksheets.");
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.send('Logged out. <a href="/students/login-form">Login again</a>');
    });
});

module.exports = router;