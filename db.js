// db.js - minimal Postgres JSONB storage helper
// Env: DATABASE_URL (standard Postgres connection string)
// Table: public.bot_data (key text PRIMARY KEY, data jsonb)
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || null;
let client = null;

async function ensureConnect() {
  if (!connectionString) throw new Error('DATABASE_URL not provided');
  if (!client) {
    client = new Client({
      connectionString,
      ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
    });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS bot_data (
        key TEXT PRIMARY KEY,
        data JSONB
      );
    `);
  }
}

async function loadData(key = 'global') {
  await ensureConnect();
  const res = await client.query('SELECT data FROM bot_data WHERE key = $1', [key]);
  if (res.rows.length === 0) return null;
  return res.rows[0].data;
}

async function saveData(dataObj, key = 'global') {
  await ensureConnect();
  await client.query(`
    INSERT INTO bot_data(key, data)
    VALUES($1, $2)
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
  `, [key, dataObj]);
}

module.exports = { loadData, saveData };
