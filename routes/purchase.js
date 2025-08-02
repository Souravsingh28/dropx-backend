const express = require('express');
const router = express.Router();
const db = require('../models/db');
const verifyToken = require('../middleware/authMiddleware');

// Add Vendor
router.post('/vendor/add', verifyToken, (req, res) => {
    const { name, contact, address, gstin } = req.body;

    db.query(
        `INSERT INTO vendors (name, contact, address, gstin) VALUES (?, ?, ?, ?)`,
        [name, contact, address, gstin],
        (err) => {
            if (err) return res.status(500).json({ message: 'Failed to add vendor' });
            res.status(200).json({ message: 'Vendor added successfully' });
        }
    );
});

// Create Purchase Order
router.post('/create', verifyToken, (req, res) => {
    const { vendor_id, order_no, date, total_amount, remarks, items } = req.body;
    const created_by = req.user.id;

    db.query(
        `INSERT INTO purchase_orders (vendor_id, order_no, date, total_amount, remarks, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [vendor_id, order_no, date, total_amount, remarks, created_by],
        (err, result) => {
            if (err) return res.status(500).json({ message: 'Failed to create purchase order' });

            const purchase_id = result.insertId;
            const itemQueries = items.map(item => {
                return new Promise((resolve, reject) => {
                    db.query(
                        `INSERT INTO purchase_items (purchase_id, item_name, quantity, rate, unit, total)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [purchase_id, item.item_name, item.quantity, item.rate, item.unit, item.total],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });

            Promise.all(itemQueries)
                .then(() => res.status(200).json({ message: 'Purchase order and items saved' }))
                .catch(() => res.status(500).json({ message: 'Failed to save items' }));
        }
    );
});

// Get all Purchase Orders
router.get('/list', verifyToken, (req, res) => {
    const query = `
        SELECT po.*, v.name AS vendor_name
        FROM purchase_orders po
        JOIN vendors v ON po.vendor_id = v.id
        ORDER BY po.date DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ message: 'Failed to fetch purchase orders' });
        res.status(200).json(results);
    });
});

router.post('/create', verifyToken, (req, res) => {
  const {
    vendor_name,
    date,
    items,
    total_amount,
    gst_percent,
    gst_amount,
    grand_total,
    remarks
  } = req.body;

  const sql = `INSERT INTO purchases 
    (vendor_name, date, items, total_amount, gst_percent, gst_amount, grand_total, remarks, created_by) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const itemsJSON = JSON.stringify(items);

  db.query(sql, [
    vendor_name,
    date,
    itemsJSON,
    total_amount,
    gst_percent,
    gst_amount,
    grand_total,
    remarks,
    req.user.id
  ], (err, result) => {
    if (err) return res.status(500).json({ message: 'Failed to create purchase' });

    // Auto update inventory
    items.forEach(item => {
      const { name, quantity, unit } = item;
      const checkSQL = `SELECT * FROM inventory_items WHERE name = ?`;

      db.query(checkSQL, [name], (err, data) => {
        if (data.length > 0) {
          const newQty = parseFloat(data[0].quantity) + parseFloat(quantity);
          db.query(`UPDATE inventory_items SET quantity = ? WHERE name = ?`, [newQty, name]);
        } else {
          db.query(`INSERT INTO inventory_items (name, quantity, unit) VALUES (?, ?, ?)`, [name, quantity, unit]);
        }
      });
    });

    res.json({ message: 'Purchase created and inventory updated' });
  });
});


module.exports = router;
