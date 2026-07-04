import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'hrms_core',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'secret',
  max: 80,
  idleTimeoutMillis: 15000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error(`CRITICAL_DATABASE_POOL_EXCEPTION: ${err.message}`);
});

export { pool };
