const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// ✅ Submit alter entry
router.post('/entry', verifyToken, (req, res) => {
  const { lot_id, worker_id, operation, pieces } = req.body;
  const entered_by = req.user.id;

  if (!lot_id || !worker_id || !operation || !pieces) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const query = `
    INSERT INTO alter_entries (lot_id, worker_id, operation, pieces, date, entered_by)
    VALUES (?, ?, ?, ?, CURDATE(), ?)
  `;

  db.query(query, [lot_id, worker_id, operation, pieces, entered_by], (err) => {
    if (err) {
      console.error("Alter insert error:", err);
      return res.status(500).json({ message: "Failed to save entry" });
    }
    res.json({ message: "Alter entry saved successfully" });
  });
});

// ✅ Get all alter entries
router.get('/all', verifyToken, (req, res) => {
  const query = `
    SELECT ae.*, u.username AS worker_name, l.name AS lot_name
    FROM alter_entries ae
    LEFT JOIN users u ON ae.worker_id = u.id
    LEFT JOIN lots l ON ae.lot_id = l.id
    ORDER BY ae.date DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Fetch alter error:", err);
      return res.status(500).json({ message: "Failed to fetch data" });
    }

    res.json(results);
  });
});

// ✅ GET /api/alter/summary
router.get('/summary', verifyToken, (req, res) => {
  const query = `
    SELECT 
      u.username AS worker_name,
      SUM(a.pieces) AS total_pieces
    FROM alter_entries a
    JOIN users u ON a.worker_id = u.id
    GROUP BY a.worker_id
    ORDER BY total_pieces DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Alter summary error:', err);
      return res.status(500).json({ message: 'Failed to fetch summary' });
    }
    res.json(results);
  });
});


module.exports = router;
