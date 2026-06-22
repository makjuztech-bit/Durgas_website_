const db = require('../config/db');

exports.submitContact = (req, res) => {
  const { first_name, last_name, email, phone, subject, message } = req.body;

  if (!email || !message) {
    return res.status(400).json({ message: 'Email and message are required.' });
  }

  db.query(
    'INSERT INTO contact_messages (first_name, last_name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?, ?)',
    [first_name, last_name, email, phone, subject, message],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.status(201).json({ message: 'Message sent successfully', id: result.insertId });
    }
  );
};

exports.getMessages = (req, res) => {
  db.query(
    'SELECT * FROM contact_messages ORDER BY created_at DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};
