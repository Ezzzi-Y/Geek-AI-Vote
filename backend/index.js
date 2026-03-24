require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const Database = require('better-sqlite3');
const SqliteStore = require('better-sqlite3-session-store')(session);

const app = express();

const PORT = Number(process.env.PORT || 8000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
const POLL_TITLE = 'GeekAI 你想用AI做的软件或应用';
const API_PREFIX = '/api';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─── Database ────────────────────────────────────────────────────────────────

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');      // 修复：提高并发读写性能，避免锁竞争
db.pragma('busy_timeout = 5000');     // 修复：锁等待最多 5s，不再永久卡住

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    github_id TEXT UNIQUE NOT NULL,
    github_login TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS options (
    id INTEGER PRIMARY KEY,
    label TEXT NOT NULL,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    option_id INTEGER NOT NULL REFERENCES options(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, option_id)
  );
`);

// ─── Prepared Statements ──────────────────────────────────────────────────────
// 修复：listOptions 在两处使用，各自独立 prepare，避免 statement 状态冲突

const getUserByIdStmt = db.prepare('SELECT id, github_login FROM users WHERE id = ?');
const upsertUserStmt = db.prepare(`
  INSERT INTO users (github_id, github_login)
  VALUES (?, ?)
  ON CONFLICT(github_id)
  DO UPDATE SET github_login = excluded.github_login
`);
const getUserByGithubIdStmt = db.prepare('SELECT id, github_login FROM users WHERE github_id = ?');

const listOptionsForApiStmt = db.prepare(`
  SELECT o.id, o.label, o.creator_id, COUNT(v.id) AS votes
  FROM options o
  LEFT JOIN votes v ON v.option_id = o.id
  GROUP BY o.id
  ORDER BY votes DESC, o.id ASC
`);
const listOptionsForExportStmt = db.prepare(`
  SELECT o.id, o.label, o.creator_id, COUNT(v.id) AS votes
  FROM options o
  LEFT JOIN votes v ON v.option_id = o.id
  GROUP BY o.id
  ORDER BY votes DESC, o.id ASC
`);

const getVotedOptionsStmt = db.prepare('SELECT option_id FROM votes WHERE user_id = ?');
const countUserVotesStmt = db.prepare('SELECT COUNT(*) as count FROM votes WHERE user_id = ?');
const getMyOptionStmt = db.prepare('SELECT id FROM options WHERE creator_id = ?');
const insertOptionStmt = db.prepare('INSERT INTO options (label, creator_id) VALUES (?, ?)');
const insertVoteStmt = db.prepare('INSERT INTO votes (user_id, option_id) VALUES (?, ?)');
const checkIfVotedStmt = db.prepare('SELECT 1 FROM votes WHERE user_id = ? AND option_id = ?');
const optionExistsStmt = db.prepare('SELECT id FROM options WHERE id = ?');

const createOptionWithAutoVote = db.transaction((label, userId) => {
  const optionResult = insertOptionStmt.run(label, userId);
  const optionId = Number(optionResult.lastInsertRowid);
  insertVoteStmt.run(userId, optionId);
  return optionId;
});

// ─── Passport ────────────────────────────────────────────────────────────────

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = getUserByIdStmt.get(id);
    if (!user) return done(null, false);
    done(null, { id: user.id, login: user.github_login });
  } catch (err) {
    done(err);
  }
});

const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (githubClientId && githubClientSecret) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: githubClientId,
        clientSecret: githubClientSecret,
        callbackURL: process.env.GITHUB_CALLBACK_URL || `${API_URL}${API_PREFIX}/auth/github/callback`,
      },
      (accessToken, refreshToken, profile, done) => {
        try {
          const githubId = String(profile.id);
          const login = profile.username || profile.displayName || `github_${githubId}`;
          upsertUserStmt.run(githubId, login);
          const user = getUserByGithubIdStmt.get(githubId);
          done(null, { id: user.id, login: user.github_login });
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

// 修复：用 better-sqlite3-session-store 替换默认 MemoryStore
// MemoryStore 会随登录用户增多不断占用内存，重启后全部丢失
const sessionStore = new SqliteStore({
  client: db,
  expired: {
    clear: true,
    intervalMs: 15 * 60 * 1000, // 每 15 分钟清理过期 session
  },
});

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: IS_PRODUCTION,   // 修复：生产环境 HTTPS 下必须为 true
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '请先登录' });
  next();
}

function toCsvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.get(`${API_PREFIX}/auth/github`, (req, res, next) => {
  if (!githubClientId || !githubClientSecret) {
    return res.status(500).json({ error: 'OAuth 未配置，请检查后端环境变量' });
  }
  return passport.authenticate('github', { scope: ['read:user'] })(req, res, next);
});

app.get(`${API_PREFIX}/auth/github/callback`, (req, res, next) => {
  if (!githubClientId || !githubClientSecret) {
    return res.redirect(FRONTEND_URL);
  }
  passport.authenticate('github', { failureRedirect: FRONTEND_URL })(req, res, () => {
    res.redirect(FRONTEND_URL);
  });
});

app.get(`${API_PREFIX}/me`, (req, res) => {
  if (!req.user) return res.json(null);
  return res.json({ id: req.user.id, login: req.user.login });
});

app.post(`${API_PREFIX}/logout`, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) return next(destroyErr);
      res.clearCookie('connect.sid');
      return res.json({ ok: true });
    });
  });
});

// ─── Poll Routes ──────────────────────────────────────────────────────────────

app.get(`${API_PREFIX}/options`, (req, res) => {
  const options = listOptionsForApiStmt.all();

  let votedOptionIds = [];
  let myOptionId = null;
  if (req.user) {
    const voted = getVotedOptionsStmt.all(req.user.id);
    const mine = getMyOptionStmt.get(req.user.id);
    votedOptionIds = voted.map(v => v.option_id);
    myOptionId = mine ? mine.id : null;
  }

  res.json({ title: POLL_TITLE, options, votedOptionIds, myOptionId });
});

app.post(`${API_PREFIX}/options`, requireAuth, (req, res) => {
  const label = String(req.body?.label || '').trim();
  if (!label) return res.status(400).json({ error: '选项内容不能为空' });
  if (label.length > 100) return res.status(400).json({ error: '选项内容不能超过 100 个字符' });

  const userId = req.user.id;
  const myOption = getMyOptionStmt.get(userId);
  if (myOption) return res.status(400).json({ error: '每个用户只能创建一个投票项' });

  const voteCount = countUserVotesStmt.get(userId).count;
  if (voteCount >= 2) return res.status(400).json({ error: '你已经投满两票，不能再创建投票项' });

  try {
    const optionId = createOptionWithAutoVote(label, userId);
    return res.status(201).json({ id: optionId });
  } catch (err) {
    console.error('[create option]', err);
    return res.status(500).json({ error: '创建失败，请稍后重试' });
  }
});

app.post(`${API_PREFIX}/vote/:id`, requireAuth, (req, res) => {
  const optionId = Number(req.params.id);
  if (!Number.isInteger(optionId) || optionId <= 0) {
    return res.status(400).json({ error: '无效的投票项 ID' });
  }

  const exists = optionExistsStmt.get(optionId);
  if (!exists) return res.status(404).json({ error: '投票项不存在' });

  const userId = req.user.id;
  const voteCount = countUserVotesStmt.get(userId).count;
  if (voteCount >= 2) return res.status(400).json({ error: '每人限投两票' });

  const alreadyVoted = checkIfVotedStmt.get(userId, optionId);
  if (alreadyVoted) return res.status(400).json({ error: '你已经为该选项投过票了' });

  try {
    insertVoteStmt.run(userId, optionId);
    return res.json({ ok: true });
  } catch (err) {
    console.error('[vote]', err);
    return res.status(500).json({ error: '投票失败，请稍后重试' });
  }
});

app.get(`${API_PREFIX}/export`, (req, res) => {
  const rows = listOptionsForExportStmt.all();
  const lines = ['label,votes'];
  for (const row of rows) {
    lines.push(`${toCsvCell(row.label)},${row.votes}`);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="votes.csv"');
  res.send(lines.join('\n'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: '服务器内部错误' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});