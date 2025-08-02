const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// Fetch all clients
router.get('/', verifyToken, (req, res) => {
  db.query('SELECT * FROM clients ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ message: 'Error fetching clients' });
    res.json(results);
  });
});

// Add new client
router.post('/', verifyToken, (req, res) => {
  const { name, gstin, address, contact } = req.body;

  if (!name || !gstin || !address || !contact) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const query = `INSERT INTO clients (name, gstin, address, contact) VALUES (?, ?, ?, ?)`;
  db.query(query, [name, gstin, address, contact], (err) => {
    if (err) return res.status(500).json({ message: 'Error adding client' });
    res.status(201).json({ message: 'Client added' });
  });
});
// ✅ UPDATE a client
router.put('/:id', verifyToken, (req, res) => {
  const { id } = req.params;
  const { name, gstin, address, contact } = req.body;

  const updateQuery = `
    UPDATE clients
    SET name = ?, gstin = ?, address = ?, contact = ?
    WHERE id = ?
  `;

  db.query(updateQuery, [name, gstin, address, contact, id], (err) => {
    if (err) {
      console.error("Client update error:", err);
      return res.status(500).json({ message: "Failed to update client" });
    }
    res.json({ message: "Client updated successfully" });
  });
});

// ✅ DELETE a client
router.delete('/:id', verifyToken, (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM clients WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Client delete error:", err);
      return res.status(500).json({ message: "Failed to delete client" });
    }
    res.json({ message: "Client deleted successfully" });
  });
});


module.exports = router;
