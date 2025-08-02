const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function generateInvoicePDF(invoice, items, client, callback) {
  const doc = new PDFDocument();
  const filePath = path.join(__dirname, `../pdfs/invoice_${invoice.id}.pdf`);
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc.fontSize(20).text("drop.x - INVOICE", { align: 'center' });
  doc.moveDown();

  // Invoice Info
  doc.fontSize(12).text(`Invoice No: ${invoice.invoice_no}`);
  doc.text(`Date: ${invoice.date}`);
  doc.text(`Client: ${client.client_name}`);
  doc.text(`GSTIN: ${client.gstin}`);
  doc.text(`Address: ${client.address}`);
  doc.moveDown();

  // Table Header
  doc.text("Description", 50, doc.y);
  doc.text("HSN", 200, doc.y);
  doc.text("Qty", 280, doc.y);
  doc.text("Rate", 340, doc.y);
  doc.text("Amount", 400, doc.y);
  doc.moveDown();

  // Table Rows
  let total = 0;
  items.forEach(item => {
    const qty = parseFloat(item.quantity) || 0;
    const rate = parseFloat(item.rate) || 0;
    const amount = qty * rate;
    total += amount;

    doc.text(item.description || '-', 50, doc.y);
    doc.text(item.hsn_code || '-', 200, doc.y);
    doc.text(qty.toString(), 280, doc.y);
    doc.text(rate.toFixed(2), 340, doc.y);
    doc.text(amount.toFixed(2), 400, doc.y);
    doc.moveDown();
  });

  // Totals
  doc.moveDown();
  const gst = parseFloat(invoice.gst_amount) || 0;
const gstPercent = parseFloat(invoice.gst_percent) || 0;
const grandTotal = parseFloat(invoice.grand_total) || 0;

doc.text(`Total: ₹${total.toFixed(2)}`);
doc.text(`GST (${gstPercent}%): ₹${gst.toFixed(2)}`);
doc.text(`Grand Total: ₹${grandTotal.toFixed(2)}`);


  doc.end();

  stream.on('finish', () => {
    callback(filePath);
  });
}

module.exports = generateInvoicePDF;
