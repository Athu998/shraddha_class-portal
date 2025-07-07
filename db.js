require('dotenv').config(); // Load environment variables

const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const db = mongoose.connection;

db.on('error', console.error.bind(console, '❌ MongoDB not connected'));
db.once('open', () => {
  console.log("✅ Connected to MongoDB Atlas");
});

module.exports = db;
