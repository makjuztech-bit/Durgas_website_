const db = require('../config/db');

exports.getSettings = async (req, res) => {
  try {
    const rows = await db.query('SELECT key, value FROM app_settings').catch(() => []);
    const settings = {
      whatsapp_number: process.env.WHATSAPP_NUMBER || '917448882444',
      store_name: 'Durgas Jewellery',
      delivery_charge: 0,
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
      whatsapp_number: process.env.WHATSAPP_NUMBER || '917448882444',
      store_name: 'Durgas Jewellery',
      delivery_charge: 0,
    });
  }
};

exports.updateSettings = async (req, res) => {
  const { whatsapp_number, store_name, delivery_charge } = req.body;

  try {
    if (whatsapp_number) {
      const cleanNum = whatsapp_number.replace(/\D/g, '');
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
        ['whatsapp_number', cleanNum]
      );
    }
    if (store_name) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
        ['store_name', store_name.trim()]
      );
    }
    if (delivery_charge !== undefined) {
      await db.query(
        'INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
        ['delivery_charge', String(parseFloat(delivery_charge) || 0)]
      );
    }

    res.json({ message: 'Settings updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update settings: ' + err.message });
  }
};
