require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const Database = require('better-sqlite3');

const app = express();

const PORT = Number(process.env.PORT || 8000);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-session-secret';
const POLL_TITLE = 'GeekAI 最想上的功能';

const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

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
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id),
    option_id INTEGER NOT NULL REFERENCES options(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

const getUserByIdStmt = db.prepare('SELECT id, github_login FROM users WHERE id = ?');
const upsertUserStmt = db.prepare(`
  INSERT INTO users (github_id, github_login)
  VALUES (?, ?)
  ON CONFLICT(github_id)
  DO UPDATE SET github_login = excluded.github_login
`);
const getUserByGithubIdStmt = db.prepare('SELECT id, github_login FROM users WHERE github_id = ?');

const listOptionsStmt = db.prepare(`
  SELECT o.id, o.label, o.creator_id, COUNT(v.id) AS votes
  FROM options o
  LEFT JOIN votes v ON v.option_id = o.id
  GROUP BY o.id
  ORDER BY votes DESC, o.id ASC
`);
const getVotedOptionStmt = db.prepare('SELECT option_id FROM votes WHERE user_id = ?');
const getMyOptionStmt = db.prepare('SELECT id FROM options WHERE creator_id = ?');
const insertOptionStmt = db.prepare('INSERT INTO options (label, creator_id) VALUES (?, ?)');
const insertVoteStmt = db.prepare('INSERT INTO votes (user_id, option_id) VALUES (?, ?)');
const optionExistsStmt = db.prepare('SELECT id FROM options WHERE id = ?');

const createOptionWithAutoVote = db.transaction((label, userId) => {
  const optionResult = insertOptionStmt.run(label, userId);
  const optionId = Number(optionResult.lastInsertRowid);
  insertVoteStmt.run(userId, optionId);
  return optionId;
});

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  try {
    const user = getUserByIdStmt.get(id);
    if (!user) {
      return done(null, false);
    }
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
        callbackURL: process.env.GITHUB_CALLBACK_URL || `${API_URL}/auth/github/callback`,
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

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: '请先登录' });
  }
  next();
}

function toCsvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

app.get('/auth/github', (req, res, next) => {
  if (!githubClientId || !githubClientSecret) {
    return res.status(500).json({ error: 'OAuth 未配置，请检查后端环境变量' });
  }
  return passport.authenticate('github', { scope: ['read:user'] })(req, res, next);
});

app.get('/auth/github/callback', (req, res, next) => {
  if (!githubClientId || !githubClientSecret) {
    return res.redirect(FRONTEND_URL);
  }
  passport.authenticate('github', { failureRedirect: FRONTEND_URL })(req, res, () => {
    res.redirect(FRONTEND_URL);
  });
});

app.get('/me', (req, res) => {
  if (!req.user) {
    return res.json(null);
  }
  return res.json({ id: req.user.id, login: req.user.login });
});

app.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return next(destroyErr);
      }
      res.clearCookie('connect.sid');
      return res.json({ ok: true });
    });
  });
});

app.get('/options', (req, res) => {
  const options = listOptionsStmt.all();

  let votedOptionId = null;
  let myOptionId = null;
  if (req.user) {
    const voted = getVotedOptionStmt.get(req.user.id);
    const mine = getMyOptionStmt.get(req.user.id);
    votedOptionId = voted ? voted.option_id : null;
    myOptionId = mine ? mine.id : null;
  }

  res.json({
    title: POLL_TITLE,
    options,
    votedOptionId,
    myOptionId,
  });
});

app.post('/options', requireAuth, (req, res) => {
  const label = String(req.body?.label || '').trim();
  if (!label) {
    return res.status(400).json({ error: '选项内容不能为空' });
  }
  if (label.length > 100) {
    return res.status(400).json({ error: '选项内容不能超过 100 个字符' });
  }

  const userId = req.user.id;
  const myOption = getMyOptionStmt.get(userId);
  if (myOption) {
    return res.status(400).json({ error: '每个用户只能创建一个投票项' });
  }

  const voted = getVotedOptionStmt.get(userId);
  if (voted) {
    return res.status(400).json({ error: '你已经投过票，不能再创建投票项' });
  }

  try {
    const optionId = createOptionWithAutoVote(label, userId);
    return res.status(201).json({ id: optionId });
  } catch (err) {
    return res.status(500).json({ error: '创建失败，请稍后重试' });
  }
});

app.post('/vote/:id', requireAuth, (req, res) => {
  const optionId = Number(req.params.id);
  if (!Number.isInteger(optionId) || optionId <= 0) {
    return res.status(400).json({ error: '无效的投票项 ID' });
  }

  const exists = optionExistsStmt.get(optionId);
  if (!exists) {
    return res.status(404).json({ error: '投票项不存在' });
  }

  try {
    insertVoteStmt.run(req.user.id, optionId);
    return res.json({ ok: true });
  } catch (err) {
    if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: '每人只能投票一次' });
    }
    return res.status(500).json({ error: '投票失败，请稍后重试' });
  }
});

app.get('/export', (req, res) => {
  const rows = listOptionsStmt.all();
  const lines = ['label,votes'];
  for (const row of rows) {
    lines.push(`${toCsvCell(row.label)},${row.votes}`);
  }

  const csv = lines.join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="votes.csv"');
  res.send(csv);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  return res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
