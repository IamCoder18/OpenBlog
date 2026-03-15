import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database for migrations.');

    // Create a migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const { rowCount } = await client.query(
          'SELECT 1 FROM _migrations WHERE name = $1',
          [file]
        );

        if (rowCount === 0) {
          console.log(`Executing migration: ${file}`);
          const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO _migrations (name) VALUES ($1)',
              [file]
            );
            await client.query('COMMIT');
            console.log(`Migration ${file} executed successfully.`);
          } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Migration ${file} failed:`, error);
            throw error;
          }
        } else {
          console.log(`Migration ${file} already executed. Skipping.`);
        }
      }
    }

    console.log('All migrations completed.');
  } catch (error) {
    console.error('Migration process failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();