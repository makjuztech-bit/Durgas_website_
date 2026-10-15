const db = require('../config/db');

exports.getSettings = async (req, res) => {
  try {
    const rows = await db.query('SELECT key, value FROM app_settings').catch(() => []);
    const settings = {
      whatsapp_number: process.env.WHATSAPP_NUMBER || '919344572003',
      store_name: 'Durgas Jewellery',
      delivery_charge: 0,
      upi_id: process.env.UPI_ID || '9344572003@upi',
    };

    if (Array.isArray(rows)) {
      rows.forEach(r => {
        if (r.key === 'delivery_charge') {
          settings[r.key] = parseFloat(r.value) || 0;
        } else {
          settings[r.key] = r.value;
        }
      });
    }

    res.json(settings);
  } catch (err) {
    res.json({
      whatsapp_number: process.env.WHATSAPP_NUMBER || '919344572003',
      store_name: 'Durgas Jewellery',
      delivery_charge: 0,
      upi_id: process.env.UPI_ID || '9344572003@upi',
    });
  }
};

exports.updateSettings = async (req, res) => {
  const { whatsapp_number, store_name, delivery_charge, upi_id } = req.body;

  try {
    if (whatsapp_number) {
      const cleanNum = whatsapp_number.replace(/\D/g, '');
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING 1',
        ['whatsapp_number', cleanNum]
      );
    }
    if (store_name) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING 1',
        ['store_name', store_name.trim()]
      );
    }
    if (delivery_charge !== undefined) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING 1',
        ['delivery_charge', String(parseFloat(delivery_charge) || 0)]
      );
    }
    if (upi_id) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW() RETURNING 1',
        ['upi_id', upi_id.trim()]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings: ' + err.message });
  }
};
