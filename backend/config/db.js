const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Mugesh@26',
  database: process.env.DB_NAME || 'Durgas_shop_db',
  waitForConnections: true,
  connectionLimit: 10,
});

db.query('SELECT 1', (err, result) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Database connected:', result[0]);
  }
});

module.exports = db;
