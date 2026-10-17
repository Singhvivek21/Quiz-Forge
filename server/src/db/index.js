const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

const dbPath = path.resolve(__dirname, '../../', config.databasePath);

// Ensure the data directory exists
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

let db;

/**
 * Ensures table schema matches modern Step 10 specification.
 * If legacy placeholder tables are detected, safely drops them so new tables are created with proper schemas.
 */
function checkAndMigrateSchema() {
  try {
    const stmt = db.prepare('PRAGMA table_info(questions)');
    const cols = [];
    while (stmt.step()) {
      cols.push(stmt.getAsObject().name);
    }
    stmt.free();

    // If legacy table exists with 'body' column rather than 'question' & 'correct_answer'
    if (cols.includes('body') || (cols.length > 0 && !cols.includes('correct_answer'))) {
      db.run('DROP TABLE IF EXISTS answers;');
      db.run('DROP TABLE IF EXISTS attempts;');
      db.run('DROP TABLE IF EXISTS questions;');
      db.run('DROP TABLE IF EXISTS quizzes;');
      db.run('DROP TABLE IF EXISTS progress;');
      db.run('DROP TABLE IF EXISTS users;');
    }
  } catch (err) {
    // Table doesn't exist yet
  }
}

/**
 * Ensures table has a specific column, adding it if missing.
 */
const SAFE_SQL_IDENT = /^[a-zA-Z0-9_]+$/;

function ensureColumn(tableName, columnName, columnDef) {
  if (!SAFE_SQL_IDENT.test(tableName) || !SAFE_SQL_IDENT.test(columnName)) {
    throw new Error('Invalid SQL identifier in schema migration');
  }
  try {
    const stmt = db.prepare(`PRAGMA table_info(${tableName})`);
    const cols = [];
    try {
      while (stmt.step()) {
        cols.push(stmt.getAsObject().name);
      }
    } finally {
      stmt.free();
    }

    if (!cols.includes(columnName)) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
    }
  } catch (err) {
    // Ignore error if table does not exist yet
  }
}

/**
 * Initialises (or opens) the SQLite database.
 * Creates all tables and indexes if they do not exist.
 */
async function initDb() {
  const SQL = await initSqlJs();

  // Load existing DB from disk or create fresh
  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }

  // Helper: persist DB to disk after each write
  db._save = () => {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  };

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON;');

  // Migrate legacy draft schemas if present
  checkAndMigrateSchema();

  // ── 1. Users Table ────────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── 2. Quizzes Table ──────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id                  TEXT PRIMARY KEY,
      user_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
      title               TEXT NOT NULL,
      subject             TEXT NOT NULL,
      topic               TEXT NOT NULL,
      difficulty          TEXT NOT NULL DEFAULT 'medium',
      question_count      INTEGER NOT NULL DEFAULT 10,
      language            TEXT NOT NULL DEFAULT 'English',
      time_limit          INTEGER,
      enable_hints        INTEGER NOT NULL DEFAULT 1,
      enable_explanations INTEGER NOT NULL DEFAULT 1,
      is_adaptive         INTEGER NOT NULL DEFAULT 0,
      has_source_material INTEGER NOT NULL DEFAULT 0,
      source_material     TEXT,
      status              TEXT NOT NULL DEFAULT 'ready',
      created_at          TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('users', 'xp', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'level', 'INTEGER NOT NULL DEFAULT 1');
  ensureColumn('users', 'streak', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'best_streak', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('users', 'last_active_date', 'TEXT');
  ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'student'");

  ensureColumn('quizzes', 'has_source_material', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('quizzes', 'source_material', 'TEXT');
  ensureColumn('quizzes', 'is_shared', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('quizzes', 'share_code', 'TEXT');
  ensureColumn('quizzes', 'created_by_role', "TEXT NOT NULL DEFAULT 'student'");
  ensureColumn('quizzes', 'allow_anonymous_attempts', 'INTEGER NOT NULL DEFAULT 1');

  // ── 3. Questions Table ────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS questions (
      id               TEXT PRIMARY KEY,
      quiz_id          TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      type             TEXT NOT NULL DEFAULT 'mcq',
      context          TEXT,
      question         TEXT NOT NULL,
      options          TEXT NOT NULL,
      correct_answer   TEXT NOT NULL,
      unit             TEXT,
      numeric_answer   REAL,
      tolerance        REAL DEFAULT 0.01,
      explanation      TEXT,
      hint             TEXT,
      concept          TEXT,
      difficulty       TEXT NOT NULL DEFAULT 'medium',
      source_reference TEXT,
      position         INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('questions', 'type', "TEXT NOT NULL DEFAULT 'mcq'");
  ensureColumn('questions', 'context', 'TEXT');
  ensureColumn('questions', 'unit', 'TEXT');
  ensureColumn('questions', 'numeric_answer', 'REAL');
  ensureColumn('questions', 'tolerance', 'REAL DEFAULT 0.01');
  ensureColumn('questions', 'source_reference', 'TEXT');

  // ── 4. Attempts Table ─────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS attempts (
      id                 TEXT PRIMARY KEY,
      quiz_id            TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      user_id            TEXT REFERENCES users(id) ON DELETE SET NULL,
      student_name       TEXT DEFAULT 'Anonymous Student',
      student_identifier TEXT,
      score              INTEGER NOT NULL DEFAULT 0,
      total_questions    INTEGER NOT NULL DEFAULT 0,
      percentage         REAL NOT NULL DEFAULT 0.0,
      correct_count      INTEGER NOT NULL DEFAULT 0,
      incorrect_count    INTEGER NOT NULL DEFAULT 0,
      unanswered_count   INTEGER NOT NULL DEFAULT 0,
      time_taken         INTEGER NOT NULL DEFAULT 0,
      xp_earned          INTEGER NOT NULL DEFAULT 0,
      completed_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  ensureColumn('attempts', 'xp_earned', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('attempts', 'student_name', "TEXT DEFAULT 'Anonymous Student'");
  ensureColumn('attempts', 'student_identifier', 'TEXT');

  // ── 5. Answers Table ──────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS answers (
      id              TEXT PRIMARY KEY,
      attempt_id      TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
      question_id     TEXT REFERENCES questions(id) ON DELETE SET NULL,
      selected_answer TEXT,
      is_correct      INTEGER NOT NULL DEFAULT 0,
      time_taken      INTEGER DEFAULT 0
    );
  `);

  // ── 6. Achievements Table ─────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS achievements (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id    TEXT NOT NULL,
      unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, badge_id)
    );
  `);

  // ── 7. Progress Table ─────────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS progress (
      id              TEXT PRIMARY KEY,
      user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept         TEXT NOT NULL,
      subject         TEXT,
      topic           TEXT,
      correct_count   INTEGER NOT NULL DEFAULT 0,
      total_questions INTEGER NOT NULL DEFAULT 0,
      accuracy        REAL NOT NULL DEFAULT 0.0,
      attempts        INTEGER NOT NULL DEFAULT 1,
      last_practiced  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, concept)
    );
  `);

  // ── Indexes for query performance ─────────────────────────────────────────
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_quiz_id ON attempts(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_answers_attempt_id ON answers(attempt_id);
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_concept ON progress(user_id, concept);
    CREATE INDEX IF NOT EXISTS idx_quizzes_share_code ON quizzes(share_code);
  `);

  // ── Auto-seed default user & default teacher if not exists ────────────────
  const defaultUserExists = db.prepare('SELECT id FROM users WHERE id = ?');
  defaultUserExists.bind(['default_user']);
  if (!defaultUserExists.step()) {
    db.run(
      "INSERT INTO users (id, name, email, role, created_at) VALUES ('default_user', 'Student', 'student@quizforge.local', 'student', datetime('now'))"
    );
  }
  defaultUserExists.free();

  const teacherExists = db.prepare('SELECT id FROM users WHERE id = ?');
  teacherExists.bind(['default_teacher']);
  if (!teacherExists.step()) {
    db.run(
      "INSERT INTO users (id, name, email, role, created_at) VALUES ('default_teacher', 'Professor Forge', 'teacher@quizforge.local', 'teacher', datetime('now'))"
    );
  }
  teacherExists.free();

  db._save();
  console.log(`📦 SQLite database ready at ${dbPath}`);
  return db;
}

// ── Synchronous-style query helpers (wrapping sql.js API) ─────────────────

let _txDepth = 0;

function getDb() {
  if (!db) throw new Error('Database not initialised. Call initDb() first.');
  return db;
}

/** Run a statement (INSERT / UPDATE / DELETE). Persists to disk unless inside an active transaction. */
function run(sql, params = []) {
  const d = getDb();
  d.run(sql, params);
  if (_txDepth === 0) {
    d._save();
  }
}

/** Execute multiple statements atomically and flush to disk once on completion. */
function transaction(fn) {
  const d = getDb();
  _txDepth += 1;
  try {
    const result = fn();
    _txDepth -= 1;
    if (_txDepth === 0) {
      d._save();
    }
    return result;
  } catch (err) {
    _txDepth = Math.max(0, _txDepth - 1);
    throw err;
  }
}

/** Return all rows matching a SELECT */
function all(sql, params = []) {
  const d = getDb();
  const stmt = d.prepare(sql);
  try {
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    return rows;
  } finally {
    stmt.free();
  }
}

/** Return the first row matching a SELECT */
function get(sql, params = []) {
  return all(sql, params)[0] ?? null;
}

module.exports = { initDb, run, all, get, getDb, transaction };
