const db = require('../config/db');

exports.subscribe = (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  db.query(
    'INSERT INTO newsletter_subscribers (email) VALUES (?)',
    [email],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already subscribed.' });
        }
        return res.status(500).json({ message: err.message });
      }
      res.status(201).json({ message: 'Subscribed successfully', id: result.insertId });
    }
  );
};

exports.getSubscribers = (req, res) => {
  db.query(
    'SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC',
    (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    }
  );
};
