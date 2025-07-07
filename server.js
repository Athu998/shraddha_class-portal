const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const db = require('./db');


const studentRoute = require('./routes/studentRoutes');
const adminRoute = require('./routes/adminRoutes');



const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


app.use(session({
  secret: 'yourSecretKey', 
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2 
  }
}));



app.use('/students', studentRoute);
app.use('/admin', adminRoute);


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
