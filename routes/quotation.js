const express = require("express");
const router = express.Router();
const db = require("../models/db");
const verifyToken = require("../middleware/authMiddleware");
const generateQuotationPDF = require("../utils/quotationPDF");

router.post("/create", verifyToken, (req, res) => {
  const { client_id, quotation_no, date, remarks, items } = req.body;
  const created_by = req.user.id;

  const insertQuotation = `INSERT INTO quotations (client_id, quotation_no, date, remarks, created_by)
                           VALUES (?, ?, ?, ?, ?)`;

  db.query(insertQuotation, [client_id, quotation_no, date, remarks, created_by], (err, result) => {
    if (err) return res.status(500).json({ message: "Failed to create quotation" });

    const quotation_id = result.insertId;
    const itemInsertQuery = `INSERT INTO quotation_items (quotation_id, item_name, quantity, rate) VALUES ?`;
    const itemValues = items.map(item => [quotation_id, item.item_name, item.quantity, item.rate]);

    db.query(itemInsertQuery, [itemValues], (err) => {
      if (err) return res.status(500).json({ message: "Failed to add items" });
      res.status(200).json({ message: "Quotation created", quotation_id });
    });
  });
});

router.get("/download/:id", verifyToken, (req, res) => {
  const quotation_id = req.params.id;

  const query = `
    SELECT q.*, c.name AS client_name, c.address, c.gstin
    FROM quotations q
    JOIN clients c ON q.client_id = c.id
    WHERE q.id = ?
  `;

  db.query(query, [quotation_id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ message: "Quotation not found" });

    const quotation = results[0];

    const itemQuery = `SELECT * FROM quotation_items WHERE quotation_id = ?`;
    db.query(itemQuery, [quotation_id], async (err, items) => {
      if (err) return res.status(500).json({ message: "Error fetching items" });

      const filePath = await generateQuotationPDF(quotation, items);
      res.download(filePath);
    });
  });
});

module.exports = router;
