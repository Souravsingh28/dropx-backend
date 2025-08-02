// routes/lots.js
const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

// ✅ Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname;
    cb(null, unique);
  },
});
const upload = multer({ storage });

// ✅ Create Lot
router.post('/create', verifyToken, upload.single('image'), (req, res) => {
  const { lot_name, party_id, operations } = req.body;
  const created_by = req.user.id;

  if (!lot_name || !party_id || !operations) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  let imagePath = '';
  if (req.file) {
    imagePath = `http://localhost:5000/uploads/${req.file.filename}`;
  }

  let parsedOps;
  try {
    parsedOps = JSON.parse(operations);
  } catch (err) {
    return res.status(400).json({ message: 'Invalid operations JSON format' });
  }

  const q = `
    INSERT INTO lots (name, image, operations, created_by, party_id)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(q, [lot_name, imagePath, JSON.stringify(parsedOps), created_by, party_id], (err) => {
    if (err) {
      console.error("Lot insert error:", err);
      return res.status(500).json({ message: 'Failed to create lot' });
    }

    res.status(201).json({ message: 'Lot created successfully' });
  });
});

// ✅ Get all lots
router.get('/all', verifyToken, (req, res) => {
  const query = `
    SELECT 
      l.id,
      l.name AS lot_name,
      c.name AS party_name,
      l.image AS image_url,
      u.username AS created_by,
      l.operations
    FROM lots l
    LEFT JOIN clients c ON l.party_id = c.id
    LEFT JOIN users u ON l.created_by = u.id
    ORDER BY l.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('DB error fetching lots:', err);
      return res.status(500).json({ message: 'Failed to fetch lots' });
    }

    const parsed = results.map(lot => ({
      ...lot,
      operations: typeof lot.operations === 'string'
        ? JSON.parse(lot.operations)
        : lot.operations
    }));

    res.json(parsed);
  });
});

// ✅ Update Lot
router.put('/update/:id', verifyToken, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { lot_name, party_id, operations } = req.body;
  const image = req.file?.filename;

  if (!lot_name || !party_id || !operations) {
    return res.status(400).json({ message: "Missing fields" });
  }

  let updateQuery = `UPDATE lots SET name = ?, party_id = ?, operations = ?`;
  const values = [lot_name, party_id, operations];

  if (image) {
    updateQuery += `, image = ?`;
    values.push(`http://localhost:5000/uploads/${image}`);
  }

  updateQuery += ` WHERE id = ?`;
  values.push(id);

  db.query(updateQuery, values, (err) => {
    if (err) {
      console.error("Update lot error:", err);
      return res.status(500).json({ message: "Failed to update lot" });
    }

    res.json({ message: "Lot updated successfully" });
  });
});

// ✅ Delete Lot
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM lots WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Lot delete error:", err);
      return res.status(500).json({ message: "Failed to delete lot" });
    }
    res.json({ message: "Lot deleted successfully" });
  });
});

// ✅ Get lot by ID (used in MyWork)
router.get('/:id', verifyToken, (req, res) => {
  const lotId = req.params.id;

  const query = `SELECT id, name AS lot_name, image AS photo FROM lots WHERE id = ?`;

  db.query(query, [lotId], (err, results) => {
    if (err) {
      console.error('❌ Lot fetch error:', err);
      return res.status(500).json({ message: 'Error fetching lot' });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Lot not found' });
    }

    res.json(results[0]);
  });
});

module.exports = router;
