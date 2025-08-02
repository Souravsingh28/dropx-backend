const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// Incharge Dashboard: View department workers and their production
router.get('/dashboard', verifyToken, (req, res) => {
  const user = req.user;
  if (user.role !== 'incharge') {
    return res.status(403).json({ message: "Only incharges can access this" });
  }

  const month = req.query.month || new Date().getMonth() + 1;
  const year = req.query.year || new Date().getFullYear();

  const q = `
    SELECT u.id AS worker_id, u.username,
           SUM(p.pieces) AS total_pieces,
           SUM(p.pieces * p.rate) AS total_salary
    FROM users u
    LEFT JOIN production_entries p ON u.id = p.worker_id
      AND MONTH(p.date) = ? AND YEAR(p.date) = ?
    WHERE u.department_id = ?
      AND u.role = 'worker'
    GROUP BY u.id
    ORDER BY total_pieces DESC
  `;

  db.query(q, [month, year, user.department_id], (err, results) => {
    if (err) return res.status(500).json({ message: "Failed to load dashboard" });

    const topPerformer = results[0] || null;
    const bottomPerformer = results[results.length - 1] || null;

    res.json({
      month, year,
      department_id: user.department_id,
      summary: results,
      top_performer: topPerformer,
      bottom_performer: bottomPerformer
    });
  });
});

module.exports = router;
