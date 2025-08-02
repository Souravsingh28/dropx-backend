const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'maglev.proxy.rlwy.net',
  user: 'root',
  password: 'eLfDYGCjJpQgOFubWmEjVBSZTGQTgkEF',
  database: 'railway',
  port: 56811
});

db.connect((err) => {
  if (err) {
    console.error('DB Connection Failed:', err);
  } else {
    console.log('MySQL Connected');
  }
});

module.exports = db;
