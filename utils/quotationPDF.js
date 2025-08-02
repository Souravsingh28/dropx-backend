const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateQuotationPDF(quotation, items) {
  return new Promise((resolve) => {
    const filePath = `invoices/QUOTATION_${quotation.quotation_no}.pdf`;
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(20).text("Quotation", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Quotation No: ${quotation.quotation_no}`);
    doc.text(`Client: ${quotation.client_name}`);
    doc.text(`Date: ${quotation.date}`);
    doc.moveDown();

    doc.text("Items:", { underline: true });

    items.forEach((item, i) => {
      const line = `${i + 1}. ${item.item_name} - Qty: ${item.quantity}, Rate: ₹${item.rate}`;
      doc.text(line);
    });

    doc.moveDown();
    doc.text("Remarks: " + quotation.remarks);

    doc.end();

    resolve(filePath);
  });
}

module.exports = generateQuotationPDF;
