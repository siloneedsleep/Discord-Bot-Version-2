const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false
});

let isInitialized = false;

async function ensureTable() {
  if (isInitialized) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_data (
      key TEXT PRIMARY KEY,
      data JSONB
    );
  `);
  isInitialized = true;
}

async function loadData(key = 'global') {
  await ensureTable();
  const res = await pool.query('SELECT data FROM bot_data WHERE key = $1', [key]);
  return res.rows.length === 0 ? null : res.rows[0].data;
}

async function saveData(dataObj, key = 'global') {
  await ensureTable();
  await pool.query(`
    INSERT INTO bot_data(key, data)
    VALUES($1, $2)
    ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
  `, [key, dataObj]);
}

module.exports = { loadData, saveData, pool };
