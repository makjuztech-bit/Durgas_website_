const db = require('../config/db');

const getProductImages = (productId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, id ASC',
      [productId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });
};

const formatProduct = (product, images) => ({
  ...product,
  images: images || [],
  image: images?.[0]?.image_path || null,
});

exports.getProducts = (req, res) => {
  const { category, badge, limit, sort } = req.query;
  let sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_active = 1
  `;
  const params = [];

  if (category) {
    sql += ' AND (c.slug = ? OR c.name = ?)';
    params.push(category, category);
  }
  if (badge) {
    sql += ' AND p.badge = ?';
    params.push(badge);
  }

  if (sort === 'price_asc') sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else if (sort === 'newest') sql += ' ORDER BY p.created_at DESC';
  else sql += ' ORDER BY p.created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));
  }

  db.query(sql, params, async (err, products) => {
    if (err) return res.status(500).json({ message: err.message });

    try {
      const result = await Promise.all(
        products.map(async (p) => {
          const images = await getProductImages(p.id);
          return formatProduct(p, images);
        })
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};

exports.getProductById = (req, res) => {
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `;

  db.query(sql, [req.params.id], async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });

    try {
      const images = await getProductImages(rows[0].id);
      res.json(formatProduct(rows[0], images));
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};

exports.addProduct = (req, res) => {
  const {
    name, description, category_id, material, purity,
    weight, price, old_price, stock, badge, sku,
  } = req.body;

  const sql = `
    INSERT INTO products
    (name, description, category_id, material, purity, weight, price, old_price, stock, badge, sku)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [name, description, category_id, material, purity, weight, price, old_price, stock, badge, sku],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });

      const productId = result.insertId;
      const files = req.files || [];

      if (!files.length) {
        return res.status(201).json({ message: 'Product created', id: productId });
      }

      const imageValues = files.map((file, i) => [
        productId,
        '/uploads/' + file.filename,
        i === 0 ? 1 : 0,
      ]);

      db.query(
        'INSERT INTO product_images (product_id, image_path, is_primary) VALUES ?',
        [imageValues],
        (imgErr) => {
          if (imgErr) return res.status(500).json({ message: imgErr.message });
          res.status(201).json({ message: 'Product created with images', id: productId });
        }
      );
    }
  );
};

exports.updateProduct = (req, res) => {
  const {
    name, description, category_id, material, purity,
    weight, price, old_price, stock, badge, sku, is_active,
  } = req.body;

  const sql = `
    UPDATE products SET
      name = ?, description = ?, category_id = ?, material = ?,
      purity = ?, weight = ?, price = ?, old_price = ?,
      stock = ?, badge = ?, sku = ?, is_active = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [name, description, category_id, material, purity, weight, price, old_price, stock, badge, sku, is_active ?? 1, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!result.affectedRows) return res.status(404).json({ message: 'Product not found' });

      const files = req.files || [];
      if (!files.length) {
        return res.json({ message: 'Product updated' });
      }

      const productId = req.params.id;
      const imageValues = files.map((file, i) => [
        productId,
        '/uploads/' + file.filename,
        i === 0 ? 1 : 0,
      ]);

      db.query(
        'INSERT INTO product_images (product_id, image_path, is_primary) VALUES ?',
        [imageValues],
        (imgErr) => {
          if (imgErr) return res.status(500).json({ message: imgErr.message });
          res.json({ message: 'Product updated with new images' });
        }
      );
    }
  );
};

exports.deleteProduct = (req, res) => {
  db.query('DELETE FROM products WHERE id = ?', [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!result.affectedRows) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  });
};

exports.getAllProductsAdmin = (req, res) => {
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `;

  db.query(sql, async (err, products) => {
    if (err) return res.status(500).json({ message: err.message });

    try {
      const result = await Promise.all(
        products.map(async (p) => {
          const images = await getProductImages(p.id);
          return formatProduct(p, images);
        })
      );
      res.json(result);
    } catch (e) {
      res.status(500).json({ message: e.message });
    }
  });
};
