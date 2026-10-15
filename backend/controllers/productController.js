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
  const { category, badge, limit, offset, sort, search } = req.query;
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
  if (search) {
    sql += ' AND (p.name ILIKE ? OR p.description ILIKE ? OR p.sku ILIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (sort === 'price_asc') sql += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') sql += ' ORDER BY p.price DESC';
  else if (sort === 'newest') sql += ' ORDER BY p.created_at DESC';
  else sql += ' ORDER BY p.created_at DESC';

  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));
    if (offset) {
      sql += ' OFFSET ?';
      params.push(parseInt(offset, 10));
    }
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
  const param = req.params.id;
  const isNumeric = /^\d+$/.test(param);
  const sql = `
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${isNumeric ? '(p.id = ? OR p.sku = ?)' : '(p.sku = ? OR p.id::text = ?)'}
  `;

  db.query(sql, [param, param], async (err, rows) => {
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

exports.getRelatedProducts = (req, res) => {
  const param = req.params.id;
  const isNumeric = /^\d+$/.test(param);
  
  const findSql = `SELECT id, category_id FROM products WHERE ${isNumeric ? '(id = ? OR sku = ?)' : '(sku = ? OR id::text = ?)'}`;
  db.query(findSql, [param, param], (err, target) => {
    if (err || !target.length) return res.json([]);
    const { id, category_id } = target[0];

    const sql = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.id != ? AND p.is_active = TRUE
      ORDER BY p.price ASC
      LIMIT 6
    `;
    db.query(sql, [category_id, id], async (relErr, relProducts) => {
      if (relErr) return res.json([]);
      try {
        const result = await Promise.all(
          relProducts.map(async (p) => {
            const images = await getProductImages(p.id);
            return formatProduct(p, images);
          })
        );
        res.json(result);
      } catch (e) {
        res.json([]);
      }
    });
  });
};

exports.addProduct = (req, res) => {
  const {
    name, tamil_name, description, category_id, material, purity,
    metal_composition, available_sizes,
    weight, price, old_price, stock, badge, sku,
  } = req.body;

  // Server-side validation
  if (!name || !name.trim()) return res.status(400).json({ message: 'Product name is required.' });
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) return res.status(400).json({ message: 'Price must be a positive number.' });
  const parsedStock = parseInt(stock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) return res.status(400).json({ message: 'Stock must be a non-negative integer.' });

  const finalSku = (sku && sku.trim()) ? sku.trim() : ('DJ-PRD-' + Date.now().toString().slice(-6));

  const sql = `
    INSERT INTO products
    (name, tamil_name, description, category_id, material, purity, metal_composition, available_sizes, weight, price, old_price, stock, badge, sku, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
  `;

  db.query(
    sql,
    [
      name.trim(),
      tamil_name?.trim() || null,
      description?.trim() || null,
      category_id ? parseInt(category_id, 10) : null,
      material?.trim() || null,
      purity?.trim() || null,
      metal_composition?.trim() || null,
      available_sizes?.trim() || null,
      weight ? parseFloat(weight) : null,
      parsedPrice,
      old_price ? parseFloat(old_price) : null,
      parsedStock,
      badge?.trim() || null,
      finalSku,
    ],
    (err, result) => {
      if (err) {
        if (err.code === '23505' && err.message.includes('sku')) {
          return res.status(409).json({ message: 'A product with this SKU already exists.' });
        }
        if (err.code === '23503') {
          return res.status(400).json({ message: 'Selected category does not exist. Please choose a valid category from the list.' });
        }
        return res.status(500).json({ message: 'Failed to create product: ' + err.message });
      }

      const productId = result.insertId;
      const files = req.files || [];
      const imageUrl = req.body.image_url?.trim() || req.body.image?.trim();

      const imageValues = [];
      if (files.length) {
        files.forEach((file, i) => {
          imageValues.push([
            productId,
            file.path || ('/uploads/' + file.filename),
            i === 0,
          ]);
        });
      } else if (imageUrl) {
        imageValues.push([productId, imageUrl, true]);
      }

      if (!imageValues.length) {
        return res.status(201).json({ message: 'Product created', id: productId });
      }

      db.query(
        'INSERT INTO product_images (product_id, image_path, is_primary) VALUES ?',
        [imageValues],
        (imgErr) => {
          if (imgErr) return res.status(500).json({ message: 'Product created but images failed to save: ' + imgErr.message });
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
    tamil_name, metal_composition, available_sizes,
  } = req.body;

  // Server-side validation
  if (!name || !name.trim()) return res.status(400).json({ message: 'Product name is required.' });
  const parsedPrice = parseFloat(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) return res.status(400).json({ message: 'Price must be a positive number.' });
  const parsedStock = parseInt(stock, 10);
  if (isNaN(parsedStock) || parsedStock < 0) return res.status(400).json({ message: 'Stock must be a non-negative integer.' });

  const sql = `
    UPDATE products SET
      name = ?, tamil_name = ?, description = ?, category_id = ?, material = ?,
      purity = ?, metal_composition = ?, available_sizes = ?, weight = ?, price = ?, old_price = ?,
      stock = ?, badge = ?, sku = ?, is_active = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      name.trim(),
      tamil_name?.trim() || null,
      description?.trim() || null,
      category_id ? parseInt(category_id, 10) : null,
      material?.trim() || null,
      purity?.trim() || null,
      metal_composition?.trim() || null,
      available_sizes?.trim() || null,
      weight ? parseFloat(weight) : null,
      parsedPrice,
      old_price ? parseFloat(old_price) : null,
      parsedStock,
      badge?.trim() || null,
      sku?.trim() || null,
      !(is_active === false || is_active === 0 || is_active === '0' || is_active === 'false'),
      req.params.id,
    ],
    (err, result) => {
      if (err) {
        if (err.code === '23505' && err.message.includes('sku')) {
          return res.status(409).json({ message: 'A product with this SKU already exists.' });
        }
        if (err.code === '23503') {
          return res.status(400).json({ message: 'Selected category does not exist. Please choose a valid category from the list.' });
        }
        return res.status(500).json({ message: 'Failed to update product: ' + err.message });
      }
      if (!result.affectedRows) return res.status(404).json({ message: 'Product not found' });

      const files = req.files || [];
      const imageUrl = req.body.image_url?.trim() || req.body.image?.trim();
      const imageValues = [];

      if (files.length) {
        files.forEach((file, i) => {
          imageValues.push([
            req.params.id,
            file.path || ('/uploads/' + file.filename),
            i === 0,
          ]);
        });
      } else if (imageUrl) {
        imageValues.push([req.params.id, imageUrl, true]);
      }

      if (!imageValues.length) {
        return res.json({ message: 'Product updated' });
      }

      db.query('DELETE FROM product_images WHERE product_id = ?', [req.params.id], () => {
        db.query(
          'INSERT INTO product_images (product_id, image_path, is_primary) VALUES ?',
          [imageValues],
          (imgErr) => {
            if (imgErr) return res.status(500).json({ message: 'Product updated but new images failed to save: ' + imgErr.message });
            res.json({ message: 'Product updated with new images' });
          }
        );
      });
    }
  );
};

exports.deleteProduct = (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (!productId) return res.status(400).json({ message: 'Invalid product ID.' });

  // Guard: check if this product exists in any order_items
  db.query(
    'SELECT COUNT(*) AS cnt FROM order_items WHERE product_id = ?',
    [productId],
    (checkErr, checkRows) => {
      if (checkErr) return res.status(500).json({ message: 'Failed to check product references: ' + checkErr.message });
      const hasOrders = Number(checkRows[0]?.cnt) > 0;

      if (hasOrders) {
        // Soft delete / archive to preserve customer tax invoices while removing from store
        db.query('UPDATE products SET is_active = false WHERE id = ?', [productId], (updErr, result) => {
          if (updErr) return res.status(500).json({ message: 'Failed to archive product: ' + updErr.message });
          if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
          db.query('DELETE FROM cart WHERE product_id = ?', [productId], () => {});
          db.query('DELETE FROM wishlist WHERE product_id = ?', [productId], () => {});
          res.json({ message: 'Product removed from store successfully (archived to preserve customer order invoices).', archived: true });
        });
        return;
      }

      // No customer orders: clean up child tables and permanently delete
      db.query('DELETE FROM product_images WHERE product_id = ?', [productId], () => {
        db.query('DELETE FROM cart WHERE product_id = ?', [productId], () => {
          db.query('DELETE FROM wishlist WHERE product_id = ?', [productId], () => {
            db.query('DELETE FROM reviews WHERE product_id = ?', [productId], () => {
              db.query('DELETE FROM products WHERE id = ?', [productId], (err, result) => {
                if (err) return res.status(500).json({ message: 'Failed to delete product: ' + err.message });
                if (!result.affectedRows) return res.status(404).json({ message: 'Product not found.' });
                res.json({ message: 'Product permanently deleted successfully.' });
              });
            });
          });
        });
      });
    }
  );
};

exports.getAllProductsAdmin = (req, res) => {
  const showInactive = req.query.include_inactive === 'true' || req.query.all === '1';
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${showInactive ? '' : 'WHERE p.is_active = true'}
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
