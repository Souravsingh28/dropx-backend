const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const verifyToken = require('../middleware/authMiddleware');
const db = require('../models/db');
const generateInvoicePDF = require('../utils/pdfGenerator');

// Ensure "pdfs" folder exists before writing
const ensurePDFDirExists = () => {
  const pdfDir = path.join(__dirname, '../pdfs');
  if (!fs.existsSync(pdfDir)) {
    fs.mkdirSync(pdfDir);
  }
};

router.get('/download/:id', verifyToken, (req, res) => {
  const invoiceId = req.params.id;

  ensurePDFDirExists();

  const invoiceQuery = `
    SELECT i.*, c.name AS client_name, c.gstin, c.address
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?
  `;

  db.query(invoiceQuery, [invoiceId], (err, invoiceResults) => {
    if (err) {
      console.error('DB Error (invoice):', err);
      return res.status(500).json({ message: 'Internal Server Error (invoice)' });
    }

    if (invoiceResults.length === 0) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const invoice = invoiceResults[0];

    const itemQuery = `SELECT * FROM invoice_items WHERE invoice_id = ?`;
    db.query(itemQuery, [invoiceId], (err2, itemResults) => {
      if (err2) {
        console.error('DB Error (items):', err2);
        return res.status(500).json({ message: 'Internal Server Error (items)' });
      }

      try {
        generateInvoicePDF(invoice, itemResults, invoice, (filePath) => {
          // Double-check if file exists before downloading
          fs.access(filePath, fs.constants.F_OK, (err3) => {
            if (err3) {
              console.error('PDF not found after creation:', err3);
              return res.status(500).json({ message: 'PDF generation failed' });
            }

            res.download(filePath, `invoice_${invoiceId}.pdf`, (err4) => {
              if (err4) {
                console.error('Download error:', err4);
                return res.status(500).json({ message: 'Download failed', error: err4.message });
              }
            });
          });
        });
      } catch (ex) {
        console.error('PDF Creation Error:', ex);
        return res.status(500).json({ message: 'Failed to create invoice PDF', error: ex.message });
      }
    });
  });
});


router.get('/all', verifyToken, (req, res) => {
  const query = `
    SELECT i.*, c.name AS client_name
    FROM invoices i
    JOIN clients c ON i.client_id = c.id
    ORDER BY i.id DESC
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching invoices:", err);
      return res.status(500).json({ message: "Failed to fetch invoices" });
    }

    res.json({ invoices: results });
  });
});

module.exports = router;
