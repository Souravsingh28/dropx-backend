const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// 1. Helper/Admin submits production entry
router.post('/entry', verifyToken, (req, res) => {
  const { lot_id, worker_id, operation, pieces } = req.body;
  const entered_by = req.user.id;
  const role = req.user.role;

  if (role !== 'helper' && role !== 'admin') {
    return res.status(403).json({ message: "Only helper or admin can submit" });
  }

  const getRateQuery = "SELECT operations FROM lots WHERE id = ?";
  db.query(getRateQuery, [lot_id], (err, result) => {
    if (err || result.length === 0) {
      return res.status(500).json({ message: "Lot not found" });
    }

    let operations = result[0].operations;
    if (typeof operations === 'string') {
      try {
        operations = JSON.parse(operations);
      } catch (jsonErr) {
        return res.status(500).json({ message: "Invalid operation format in lot" });
      }
    }

    const operationDetails = operations.find(op => op.name === operation);
    if (!operationDetails) {
      return res.status(400).json({ message: "Operation not found in this lot" });
    }

    const rate = parseFloat(operationDetails.rate);

    const insertQuery = `
      INSERT INTO production_entries (lot_id, worker_id, operation, pieces, rate, date, entered_by)
      VALUES (?, ?, ?, ?, ?, CURDATE(), ?)
    `;

    db.query(insertQuery, [lot_id, worker_id, operation, pieces, rate, entered_by], (err2) => {
      if (err2) {
        console.error("Insert error:", err2);
        return res.status(500).json({ message: "Error saving entry" });
      }

      return res.status(201).json({
        message: "Production entry saved",
        salary: pieces * rate
      });
    });
  });
});

// 2. Worker views their real-time salary and work
router.get('/worker/salary', verifyToken, (req, res) => {
  const user = req.user;

  if (user.role !== 'worker') {
    return res.status(403).json({ message: "Only workers can access this" });
  }

  const query = `
    SELECT lot_id, operation, pieces, rate, date
    FROM production_entries
    WHERE worker_id = ?
    ORDER BY date DESC
  `;

  db.query(query, [user.id], (err, results) => {
    if (err) {
      console.error("Salary fetch error:", err);
      return res.status(500).json({ message: "Failed to fetch salary data" });
    }

    let total = 0;
    const entries = results.map(entry => {
      const amount = Number(entry.pieces) * Number(entry.rate);
      total += amount;
      return {
        ...entry,
        amount
      };
    });

    res.json({
      total_earned: total,
      entries
    });
  });
});

// ✅ 2.1 NEW: Worker view my entries with lot name and photo
router.get('/my-entries', verifyToken, (req, res) => {
  const user = req.user;

  if (user.role !== 'worker') {
    return res.status(403).json({ message: "Only workers can access this" });
  }

  const query = `
    SELECT 
      p.date,
      p.operation,
      p.pieces,
      p.rate,
      p.pieces * p.rate AS amount,
      l.lot_name,
      l.photo
    FROM production_entries p
    JOIN lots l ON p.lot_id = l.id
    WHERE p.worker_id = ?
    ORDER BY p.date DESC
  `;

  db.query(query, [user.id], (err, rows) => {
    if (err) {
      console.error('My work entries error:', err);
      return res.status(500).json({ message: 'Error fetching work entries' });
    }
    res.json(rows);
  });
});

// ✅ 3. Admin/Incharge views full work report
router.get('/work-reports', verifyToken, (req, res) => {
  const role = req.user.role;
  if (role !== 'admin' && role !== 'incharge') {
    return res.status(403).json({ message: "Only admin or incharge can view reports" });
  }

  const { from, to, lot_id, worker_id } = req.query;

  let query = `
    SELECT 
      pe.date,
      u.username AS worker_name,
      l.name AS lot_name,
      pe.operation,
      pe.pieces,
      pe.rate,
      (pe.pieces * pe.rate) AS amount
    FROM production_entries pe
    JOIN users u ON pe.worker_id = u.id
    JOIN lots l ON pe.lot_id = l.id
    WHERE 1 = 1
  `;

  const params = [];

  if (from && to) {
    query += ' AND pe.date BETWEEN ? AND ?';
    params.push(from, to);
  }

  if (lot_id) {
    query += ' AND pe.lot_id = ?';
    params.push(lot_id);
  }

  if (worker_id) {
    query += ' AND pe.worker_id = ?';
    params.push(worker_id);
  }

  query += ' ORDER BY pe.date DESC';

  db.query(query, params, (err, rows) => {
    if (err) {
      console.error('❌ Work reports error:', err);
      return res.status(500).json({ message: 'Error fetching work reports' });
    }
    res.json(rows);
  });
});


module.exports = router;
