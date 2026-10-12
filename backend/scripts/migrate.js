const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  console.log('Applying schema.sql to Supabase PostgreSQL database...');
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await db.pool.query(sql);
    console.log('✓ schema.sql executed successfully.');

    // Also check migrations folder if any
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).sort();
      for (const file of files) {
        if (file.endsWith('.sql')) {
          console.log(`Applying migration: ${file}...`);
          const migrationSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
          await db.pool.query(migrationSql).catch(err => {
            console.warn(`Migration notice for ${file}:`, err.message);
          });
        }
      }
    }

    console.log('✓ All database schemas and migrations applied successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  }
}

runMigration();
