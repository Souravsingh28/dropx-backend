const express = require('express');
const router = express.Router();
const db = require('../models/db');
const jwt = require('jsonwebtoken');

const SECRET = "dropx_secret_key";

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const q = "SELECT * FROM users WHERE username = ? AND password = ?";
  db.query(q, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: "Server error" });
    if (results.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = results[0];
    const token = jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '1d' });

    res.json({ message: "Login successful", token, role: user.role });
  });
});

module.exports = router;
