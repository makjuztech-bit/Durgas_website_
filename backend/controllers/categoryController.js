const db = require('../config/db');

let categoryCache = null;
let categoryCacheExpiresAt = 0;
const CACHE_TTL_MS = 120 * 1000; // 2 minutes

const clearCategoryCache = () => {
  categoryCache = null;
  categoryCacheExpiresAt = 0;
};

exports.getCategories = (req, res) => {
  if (categoryCache && Date.now() < categoryCacheExpiresAt) {
    return res.json(categoryCache);
  }

  const sql = `
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.is_active = 1
    GROUP BY c.id
    ORDER BY c.name
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    categoryCache = rows || [];
    categoryCacheExpiresAt = Date.now() + CACHE_TTL_MS;
    res.json(rows);
  });
};

exports.addCategory = (req, res) => {
  const { name, tamil_name, slug, image, description } = req.body;
  const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');

  db.query(
    'INSERT INTO categories (name, tamil_name, slug, image, description) VALUES (?, ?, ?, ?, ?)',
    [name, tamil_name || null, categorySlug, image, description],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      clearCategoryCache();
      res.status(201).json({ message: 'Category created', id: result.insertId });
    }
  );
};

exports.updateCategory = (req, res) => {
  const { name, tamil_name, slug, image, description } = req.body;

  db.query(
    'UPDATE categories SET name = ?, tamil_name = ?, slug = ?, image = ?, description = ? WHERE id = ?',
    [name, tamil_name || null, slug, image, description, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'Category not found' });
      clearCategoryCache();
      res.json({ message: 'Category updated' });
    }
  );
};

exports.deleteCategory = (req, res) => {
  db.query('DELETE FROM categories WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!result.affectedRows) return res.status(404).json({ message: 'Category not found' });
    clearCategoryCache();
    res.json({ message: 'Category deleted' });
  });
};
