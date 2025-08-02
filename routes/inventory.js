const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// ✅ Add item to inventory (admin only)
router.post('/add', verifyToken, (req, res) => {
  const role = req.user.role;
  if (role !== 'admin') return res.status(403).json({ message: 'Only admin can add items' });

  let { name, unit, quantity, threshold, qr_code } = req.body;

  // ✅ Sanitize values
  threshold = threshold === '' ? null : parseFloat(threshold);
  quantity = quantity === '' ? 0 : parseFloat(quantity);

  console.log("Received item data:", { name, unit, quantity, threshold, qr_code });

  const q = `INSERT INTO inventory_items (name, unit, quantity, threshold, qr_code) VALUES (?, ?, ?, ?, ?)`;
  db.query(q, [name, unit, quantity, threshold, qr_code], (err) => {
    if (err) {
      console.error("❌ DB insert error:", err);
      return res.status(500).json({ message: 'Failed to add item' });
    }
    res.json({ message: 'Item added to inventory' });
  });
});

// ✅ Issue item to user (basic version)
router.post('/issue', verifyToken, (req, res) => {
  const { item_id, issued_to, quantity, remarks, issue_type } = req.body;
  const issued_by = req.user.id;
  const role = req.user.role;

  if (!['admin', 'incharge', 'helper'].includes(role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const getDeptQuery = `SELECT department_id FROM users WHERE id = ?`;
  db.query(getDeptQuery, [issued_to], (err, deptRes) => {
    if (err || deptRes.length === 0) {
      return res.status(500).json({ message: 'User/department not found' });
    }

    const department_id = deptRes[0].department_id;

    const updateQty = `UPDATE inventory_items SET quantity = quantity - ? WHERE id = ?`;
    db.query(updateQty, [quantity, item_id], (err2) => {
      if (err2) return res.status(500).json({ message: 'Inventory update failed' });

      const issueQuery = `
        INSERT INTO inventory_issues 
        (item_id, quantity, issued_by, issued_to, issue_type, issued_on, remarks, department_id) 
        VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
      `;
      db.query(
        issueQuery,
        [item_id, quantity, issued_by, issued_to, issue_type || 'standard', remarks, department_id],
        (err3) => {
          if (err3) return res.status(500).json({ message: 'Failed to log issue' });
          res.json({ message: 'Item issued and logged successfully' });
        }
      );
    });
  });
});

// ✅ Get current inventory
router.get('/stock', verifyToken, (req, res) => {
  db.query(`SELECT * FROM inventory_items`, (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to load inventory' });
    res.json(results);
  });
});

// ✅ Get issue history
router.get('/issues', verifyToken, (req, res) => {
  const role = req.user.role;
  const user_id = req.user.id;

  let q = `
    SELECT ii.*, i.name AS item_name, u1.username AS issued_by_name, u2.username AS issued_to_name
    FROM inventory_issues ii
    JOIN inventory_items i ON ii.item_id = i.id
    JOIN users u1 ON ii.issued_by = u1.id
    JOIN users u2 ON ii.issued_to = u2.id
  `;

  if (role === 'worker') {
    q += ` WHERE ii.issued_to = ${user_id}`;
  }

  db.query(q, (err, results) => {
    if (err) return res.status(500).json({ message: 'Failed to get issues' });
    res.json(results);
  });
});

module.exports = router;
