const db = require('../config/db');

async function seedCatalogue() {
  console.log('Seeding Five Metals & Iypponnu Jewellery catalogue...');

  try {
    // 1. Setup categories
    const categories = [
      {
        name: 'Five Metals Jewellery (Panchaloha)',
        tamil_name: 'ஐம்பொன் பஞ்சலோக நகைகள்',
        slug: 'panchaloha-jewellery',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
        description: 'Authentic traditional Panchaloha five-metal jewellery crafted with classical auspicious metal alloy.',
      },
      {
        name: 'Iypponnu / Aimpon Jewellery',
        tamil_name: 'ஐம்பொன் ஆபரணங்கள்',
        slug: 'iypponnu-jewellery',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
        description: 'Traditional Iypponnu jewellery with micro-gold polish and verified metal alloy composition.',
      },
      {
        name: 'Traditional Collections',
        tamil_name: 'பாரம்பரிய நகைகள்',
        slug: 'traditional-collections',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
        description: 'South Indian temple jewellery and heritage ornaments for festivals and auspicious occasions.',
      },
      {
        name: 'Panchaloha Rings',
        tamil_name: 'ஐம்பொன் மோதிரங்கள்',
        slug: 'panchaloha-rings',
        image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
        description: 'Traditional Panchaloha Navaratna, Om, and classical signet rings for daily wear.',
      },
      {
        name: 'Pendants & Thaali',
        tamil_name: 'டாலர் மற்றும் தாலி',
        slug: 'pendants',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
        description: 'Auspicious temple pendants, deity lockets, and sacred Iypponnu thaali pieces.',
      },
      {
        name: 'Chains & Malai',
        tamil_name: 'ஐம்பொன் சங்கிலிகள்',
        slug: 'chains',
        image: 'https://images.unsplash.com/photo-1573408301185-9519f94815f2?w=800&q=80',
        description: 'Heavy duty, traditional rope, mugappu, and classical chains made in five metals.',
      },
      {
        name: 'Bracelets & Kappu',
        tamil_name: 'ஐம்பொன் காப்பு மற்றும் வளையல்கள்',
        slug: 'bracelets-kappu',
        image: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80',
        description: 'Protective traditional five-metal kappu, kada, and engraved auspicious bangles.',
      },
    ];

    const categoryMap = {};

    for (const cat of categories) {
      const existing = await db.query('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
      let catId;
      if (existing.length) {
        catId = existing[0].id;
        await db.query(
          'UPDATE categories SET name = ?, tamil_name = ?, image = ?, description = ? WHERE id = ?',
          [cat.name, cat.tamil_name, cat.image, cat.description, catId]
        );
      } else {
        const res = await db.query(
          'INSERT INTO categories (name, tamil_name, slug, image, description) VALUES (?, ?, ?, ?, ?)',
          [cat.name, cat.tamil_name, cat.slug, cat.image, cat.description]
        );
        catId = res.insertId;
      }
      categoryMap[cat.slug] = catId;
    }

    // 2. Realistic Five Metals & Iypponnu products
    const products = [
      {
        name: 'Panchaloha Traditional Navaratna Ring',
        tamil_name: 'ஐம்பொன் நவரத்தின மோதிரம்',
        sku: 'DJ-PN-001',
        category_slug: 'panchaloha-rings',
        material: 'Panchaloha (Five Metals)',
        purity: 'Traditional 5-Metal Alloy with 24K Micron Gold Wash',
        metal_composition: 'Panchaloha Alloy: Copper (70%), Brass/Zinc (15%), Iron (5%), Silver (5%), Gold (5%) as per traditional Agamic proportions.',
        available_sizes: '12, 14, 16, 18, 20, 22 (Standard Indian)',
        weight: 6.8,
        price: 2499,
        old_price: 3200,
        stock: 25,
        badge: 'Best Seller',
        description: 'Classical Panchaloha Navaratna ring handcrafted with the traditional five sacred metals. Features 9 auspicious astrological synthetic stones handset with supreme precision for health and positivity.',
        image: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
      },
      {
        name: 'Iypponnu Traditional Peacock Mugappu Chain',
        tamil_name: 'ஐம்பொன் மயில் முகப்பு சங்கிலி',
        sku: 'DJ-IY-002',
        category_slug: 'chains',
        material: 'Iypponnu / Aimpon',
        purity: 'Traditional Aimpon Alloy with 1g Gold Plating',
        metal_composition: 'Verified Aimpon formulation: 75% Copper, 15% Zinc, 5% Tin, 3% Silver, 2% micron gold polish.',
        available_sizes: '24 Inches, 28 Inches',
        weight: 24.5,
        price: 3850,
        old_price: 4900,
        stock: 18,
        badge: 'Popular',
        description: 'Exquisite South Indian traditional peacock side-mugappu chain crafted in durable Iypponnu alloy. Long-lasting shine that mimics solid gold and suitable for daily puja and auspicious functions.',
        image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
      },
      {
        name: 'Panchaloha Sri Mahalakshmi Temple Pendant',
        tamil_name: 'ஐம்பொன் ஸ்ரீ மஹாலக்ஷ்மி டாலர்',
        sku: 'DJ-PN-003',
        category_slug: 'pendants',
        material: 'Panchaloha (Five Metals)',
        purity: 'Temple Certified Panchaloha with Antique Gold Finish',
        metal_composition: 'Copper, Brass, Zinc, Iron, and Silver classical casting. Verified shop composition.',
        available_sizes: 'Standard (3.8 cm x 2.5 cm)',
        weight: 12.2,
        price: 1850,
        old_price: 2400,
        stock: 30,
        badge: 'New',
        description: 'Divine Sri Mahalakshmi Goddess temple pendant sculptured with intricate micro-carvings in sacred Panchaloha metal. Brings prosperity and positive energy into the home.',
        image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80',
      },
      {
        name: 'Traditional Aimpon Suriya Kappu (Sun Kada)',
        tamil_name: 'ஐம்பொன் சூர்ய காப்பு (கடகம்)',
        sku: 'DJ-KP-004',
        category_slug: 'bracelets-kappu',
        material: 'Aimpon / Iypponnu',
        purity: 'High Density 5-Metal Composition',
        metal_composition: 'Classical five-metal protective alloy with engraved solar motifs.',
        available_sizes: '2.4, 2.6, 2.8, Adjustable Open-End',
        weight: 28.0,
        price: 2950,
        old_price: 3800,
        stock: 14,
        badge: 'Best Seller',
        description: 'Heavy traditional Suriya Kappu handcrafted in authentic Aimpon metal. Worn since ancient Tamil traditions for vitality, mental peace, and body heat balancing.',
        image: 'https://images.unsplash.com/photo-1611591475152-477711209351?w=800&q=80',
      },
      {
        name: 'Panchaloha Lord Murugan Vel Ring',
        tamil_name: 'ஐம்பொன் முருகன் வேல் மோதிரம்',
        sku: 'DJ-PN-005',
        category_slug: 'panchaloha-rings',
        material: 'Panchaloha (Five Metals)',
        purity: 'Temple Grade 5-Metals with Micro Polish',
        metal_composition: 'Panchaloha (Five Metals: Copper, Brass, Tin, Silver, Gold wash).',
        available_sizes: '14, 16, 18, 20, 22',
        weight: 5.5,
        price: 1650,
        old_price: 2100,
        stock: 35,
        badge: 'Popular',
        description: 'Spiritual Lord Murugan sacred Vel motif ring casted in authentic Panchaloha. Designed for continuous everyday wear without tarnishing easily.',
        image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      },
      {
        name: 'Iypponnu Heritage Kemp Kasu Haram',
        tamil_name: 'ஐம்பொன் பாரம்பரிய காசு மாலை',
        sku: 'DJ-IY-006',
        category_slug: 'traditional-collections',
        material: 'Iypponnu / Aimpon',
        purity: 'Traditional Aimpon with Micro Gold Plating & Kemp Stones',
        metal_composition: 'Traditional Aimpon base with ruby kemp synthetic stones and embossed Lakshmi coins.',
        available_sizes: 'Adjustable Dori / Thread Backing',
        weight: 48.0,
        price: 5999,
        old_price: 7800,
        stock: 10,
        badge: 'Heritage',
        description: 'Regal bridal South Indian Kasu Malai featuring detailed Lakshmi coins interspersed with rich ruby-red Kemp stones. Ideal for weddings, Bharatanatyam, and festive occasions.',
        image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&q=80',
      },
      {
        name: 'Aimpon Men Classical Rudraksha Bracelet',
        tamil_name: 'ஐம்பொன் ருத்ராட்ச காப்பு / வளையல்',
        sku: 'DJ-KP-007',
        category_slug: 'bracelets-kappu',
        material: 'Aimpon (Five Metals)',
        purity: 'Aimpon Five Metal Casting with Original Panchamukhi Rudraksha',
        metal_composition: 'Five-metal caps with natural 5-Mukhi certified Rudraksha beads.',
        available_sizes: '7.5 Inches, 8.5 Inches (Lock Type)',
        weight: 18.5,
        price: 2199,
        old_price: 2850,
        stock: 22,
        badge: 'New',
        description: 'Spiritual combination of genuine 5-Mukhi Rudraksha beads encased in durable five-metal Aimpon capping with a sturdy fold-over clasp.',
        image: 'https://images.unsplash.com/photo-1573408301185-9519f94815f2?w=800&q=80',
      },
      {
        name: 'Panchaloha Sacred Vinayagar Pendant',
        tamil_name: 'ஐம்பொன் ஸ்ரீ விநாயகர் டாலர்',
        sku: 'DJ-PN-008',
        category_slug: 'pendants',
        material: 'Panchaloha (Five Metals)',
        purity: 'Traditional 5-Metal Alloy',
        metal_composition: 'Copper (72%), Zinc (16%), Iron (4%), Silver (4%), Gold (4%) handcrafted casting.',
        available_sizes: 'Medium (3.2 cm)',
        weight: 9.6,
        price: 1550,
        old_price: 1999,
        stock: 28,
        badge: 'Auspicious',
        description: 'Auspicious Lord Ganesha pendant designed in traditional five metals for peace, wisdom, and removal of obstacles. Suitable with both gold and thread chains.',
        image: 'https://images.unsplash.com/photo-1586105251261-72a756497a11?w=800&q=80',
      },
    ];

    for (const p of products) {
      const catId = categoryMap[p.category_slug] || null;
      const existing = await db.query('SELECT id FROM products WHERE sku = ?', [p.sku]);
      let prodId;

      if (existing.length) {
        prodId = existing[0].id;
        await db.query(
          `UPDATE products SET 
            name = ?, tamil_name = ?, category_id = ?, material = ?, purity = ?,
            metal_composition = ?, available_sizes = ?, weight = ?, price = ?,
            old_price = ?, stock = ?, badge = ?, description = ?, is_active = TRUE
          WHERE id = ?`,
          [
            p.name, p.tamil_name, catId, p.material, p.purity,
            p.metal_composition, p.available_sizes, p.weight, p.price,
            p.old_price, p.stock, p.badge, p.description, prodId,
          ]
        );
      } else {
        const res = await db.query(
          `INSERT INTO products (
            name, tamil_name, sku, category_id, material, purity,
            metal_composition, available_sizes, weight, price,
            old_price, stock, badge, description, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            p.name, p.tamil_name, p.sku, catId, p.material, p.purity,
            p.metal_composition, p.available_sizes, p.weight, p.price,
            p.old_price, p.stock, p.badge, p.description,
          ]
        );
        prodId = res.insertId;
      }

      // Add product image
      await db.query('DELETE FROM product_images WHERE product_id = ?', [prodId]);
      await db.query(
        'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, TRUE)',
        [prodId, p.image]
      );
    }

    console.log(`✓ Seeded ${categories.length} categories and ${products.length} Five Metals / Iypponnu products!`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedCatalogue();
