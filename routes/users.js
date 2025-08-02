const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');

// === File Upload Config ===
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// === Register New User (admin only, with photo) ===
router.post('/register', verifyToken, upload.single('photo'), (req, res) => {
  const role = req.user.role;
  if (role !== 'admin') return res.status(403).json({ message: 'Only admins can register users' });

  const photo = req.file?.filename || null;
  const {
    name, age, gender, id_number, phone, address,
    aadhaar, bank_account, ifsc, bank_name, designation, password
  } = req.body;

  const username = id_number;

  const q = `
    INSERT INTO users
    (username, password, role, name, age, gender, id_number, phone, address, aadhaar, bank_account, ifsc, bank_name, photo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(q, [
    username, password, designation, name, age, gender, id_number, phone,
    address, aadhaar, bank_account, ifsc, bank_name, photo
  ], (err) => {
    if (err) {
      console.error('❌ User registration error:', err);
      return res.status(500).json({ message: 'Failed to register user' });
    }
    res.json({ message: 'User registered successfully', username });
  });
});

// === Get All Users (admin only, full detail) ===
router.get('/', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  const q = `
    SELECT id, username, password, role, name, age, gender, id_number, phone, address,
           aadhaar, bank_account, ifsc, bank_name, photo
    FROM users
    WHERE role IN ('worker', 'helper', 'incharge')
  `;

  db.query(q, (err, results) => {
    if (err) {
      console.error("❌ Failed to fetch users:", err);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
    res.json(results);
  });
});

// === Get All Workers (for dropdown) ===
router.get('/workers', verifyToken, (req, res) => {
  const q = `SELECT id, name, id_number FROM users WHERE role = 'worker'`;
  db.query(q, (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to fetch workers' });
    res.json(results);
  });
});

// === Update User (admin only) ===
router.put('/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  const {
    name, password, role, age, gender, id_number, phone, address,
    aadhaar, bank_account, ifsc, bank_name
  } = req.body;

  const q = `
    UPDATE users SET
      name=?, password=?, role=?, age=?, gender=?, id_number=?, phone=?,
      address=?, aadhaar=?, bank_account=?, ifsc=?, bank_name=?
    WHERE id=?
  `;

  db.query(q, [
    name, password, role, age, gender, id_number, phone, address,
    aadhaar, bank_account, ifsc, bank_name, req.params.id
  ], (err) => {
    if (err) {
      console.error("❌ Update error:", err);
      return res.status(500).json({ message: 'Failed to update user' });
    }
    res.json({ message: 'User updated successfully' });
  });
});

// === Delete User (admin only) ===
router.delete('/:id', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') return res.sendStatus(403);

  db.query(`DELETE FROM users WHERE id = ?`, [req.params.id], (err) => {
    if (err) {
      console.error("❌ Delete error:", err);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
    res.json({ message: 'User deleted successfully' });
  });
});

// === Get Logged-in User Profile ===
router.get('/me', verifyToken, (req, res) => {
  const userId = req.user.id;

  db.query(`SELECT * FROM users WHERE id = ?`, [userId], (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to get profile' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    res.json(results[0]);
  });
});

module.exports = router;
