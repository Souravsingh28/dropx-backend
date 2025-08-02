const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// Admin - Monthly salary summary
router.get('/monthly-summary', verifyToken, (req, res) => {
  const role = req.user.role;
  if (role !== 'admin') {
    return res.status(403).json({ message: "Only admin can access" });
  }

  const { month, year } = req.query;

  const q = `
    SELECT u.id AS worker_id, u.username AS worker_name, u.role AS salary_type,
           SUM(p.pieces) AS total_pieces,
           SUM(p.pieces * p.rate) AS total_salary
    FROM production_entries p
    JOIN users u ON p.worker_id = u.id
    WHERE MONTH(p.date) = ? AND YEAR(p.date) = ?
    GROUP BY p.worker_id
  `;

  db.query(q, [month, year], (err, results) => {
    if (err) {
      console.error("SQL Error:", err);  // 👈 helpful for debugging
      return res.status(500).json({ message: "Failed to generate summary" });
    }

    res.json({ month, year, summary: results });
  });
});



module.exports = router;
