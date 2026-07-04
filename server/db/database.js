// ─────────────────────────────────────────────────────────────────────────────
// database.js — SQLite connection & initialization
// Author: Soumoditya Das | Humanized Code Pattern
// Note: Schema is PostgreSQL-compatible. Swap `better-sqlite3` for `pg` driver
//       and adjust query syntax for production PostgreSQL deployment.
// ─────────────────────────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');

let db;

/**
 * Initialize the database connection.
 * Uses better-sqlite3 for zero-setup SQLite.
 * All DDL is read from schema.sql (PostgreSQL-compatible).
 */
function initDB() {
  try {
    const Database = require('better-sqlite3');
    const dbPath   = path.join(__dirname, '../../hrms.db');
    db = new Database(dbPath);

    // Enable WAL mode for performance (Write-Ahead Logging)
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    // Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    db.exec(schema);

    console.log('[DB] SQLite initialized at', dbPath);
    return db;
  } catch (err) {
    console.error('[DB] better-sqlite3 failed, falling back to in-memory store:', err.message);
    return null;
  }
}

/**
 * Returns the active DB instance (or null if SQLite unavailable).
 * All route handlers must check for null and use the fallback store.
 */
function getDB() { return db; }

module.exports = { initDB, getDB };
