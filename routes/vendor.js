const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// GET all vendors
router.get('/', verifyToken, (req, res) => {
  db.query('SELECT * FROM vendors ORDER BY id DESC', (err, results) => {
    if (err) {
      console.error('Error fetching vendors:', err);
      return res.status(500).json({ message: 'Failed to fetch vendors' });
    }
    res.json(results);
  });
});

// POST add new vendor
router.post('/add', verifyToken, (req, res) => {
  const role = req.user.role;
  if (role !== 'admin') return res.status(403).json({ message: 'Only admin can add vendors' });

  const { name, contact, address } = req.body;
  if (!name.trim()) return res.status(400).json({ message: 'Vendor name required' });

  const q = `INSERT INTO vendors (name, contact, address) VALUES (?, ?, ?)`;
  db.query(q, [name, contact, address], (err) => {
    if (err) {
      console.error('Error adding vendor:', err);
      return res.status(500).json({ message: 'Failed to add vendor' });
    }
    res.json({ message: 'Vendor added successfully' });
  });
});

module.exports = router;
