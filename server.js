// server.js — Mini Social Media Platform backend
// Stack: Express.js + SQLite (better-sqlite3) + express-session

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 } // 7 days
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Please log in first.' });
  next();
}

// Shape a raw user row into a safe public profile, adding computed counts
function publicProfile(userRow, viewerId) {
  const followers = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?').get(userRow.id).c;
  const following = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(userRow.id).c;
  const postCount = db.prepare('SELECT COUNT(*) AS c FROM posts WHERE user_id = ?').get(userRow.id).c;
  const isFollowing = viewerId
    ? !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(viewerId, userRow.id)
    : false;
  return {
    id: userRow.id,
    username: userRow.username,
    bio: userRow.bio,
    avatar_url: userRow.avatar_url,
    followers,
    following,
    postCount,
    isFollowing,
    isSelf: viewerId === userRow.id
  };
}

function shapePost(postRow, viewerId) {
  const author = db.prepare('SELECT id, username, avatar_url FROM users WHERE id = ?').get(postRow.user_id);
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(postRow.id).c;
  const commentCount = db.prepare('SELECT COUNT(*) AS c FROM comments WHERE post_id = ?').get(postRow.id).c;
  const likedByMe = viewerId
    ? !!db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(postRow.id, viewerId)
    : false;
  return {
    id: postRow.id,
    content: postRow.content,
    created_at: postRow.created_at,
    author,
    likeCount,
    commentCount,
    likedByMe
  };
}

// ---------- Auth ----------
app.post('/api/register', (req, res) => {
  const { username, email, password, bio } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) {
    return res.status(409).json({ error: 'Username already taken.' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const avatar = `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`;
  const info = db.prepare(
    'INSERT INTO users (username, email, password_hash, bio, avatar_url) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email, hash, bio || '', avatar);

  req.session.userId = info.lastInsertRowid;
  req.session.username = username;
  res.json({ id: info.lastInsertRowid, username });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ id: user.id, username: user.username });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  res.json({ user: { id: req.session.userId, username: req.session.username } });
});

// ---------- Feed / Posts ----------
app.get('/api/feed', (req, res) => {
  // Global feed, newest first (simple version; could be filtered to "following" only)
  const rows = db.prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT 100').all();
  res.json(rows.map((r) => shapePost(r, req.session.userId)));
});

app.post('/api/posts', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Post content cannot be empty.' });
  const info = db.prepare('INSERT INTO posts (user_id, content) VALUES (?, ?)').run(req.session.userId, content.trim());
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(info.lastInsertRowid);
  res.json(shapePost(post, req.session.userId));
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  if (post.user_id !== req.session.userId) return res.status(403).json({ error: 'Not your post.' });
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(post.id);
  db.prepare('DELETE FROM likes WHERE post_id = ?').run(post.id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(post.id);
  res.json({ success: true });
});

// ---------- Likes ----------
app.post('/api/posts/:id/like', requireAuth, (req, res) => {
  const postId = req.params.id;
  const existing = db.prepare('SELECT 1 FROM likes WHERE post_id = ? AND user_id = ?').get(postId, req.session.userId);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE post_id = ? AND user_id = ?').run(postId, req.session.userId);
  } else {
    db.prepare('INSERT INTO likes (post_id, user_id) VALUES (?, ?)').run(postId, req.session.userId);
  }
  const likeCount = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE post_id = ?').get(postId).c;
  res.json({ liked: !existing, likeCount });
});

// ---------- Comments ----------
app.get('/api/posts/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar_url FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(comments);
});

app.post('/api/posts/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const info = db.prepare('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.id, req.session.userId, content.trim());
  const comment = db.prepare(`
    SELECT c.*, u.username, u.avatar_url FROM comments c
    JOIN users u ON u.id = c.user_id WHERE c.id = ?
  `).get(info.lastInsertRowid);
  res.json(comment);
});

// ---------- Profiles & Follow system ----------
app.get('/api/users/:username', (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const posts = db.prepare('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
  res.json({
    profile: publicProfile(user, req.session.userId),
    posts: posts.map((p) => shapePost(p, req.session.userId))
  });
});

app.post('/api/users/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.session.userId) return res.status(400).json({ error: "You can't follow yourself." });

  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(req.session.userId, target.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.session.userId, target.id);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.session.userId, target.id);
  }
  const followers = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?').get(target.id).c;
  res.json({ following: !existing, followers });
});

app.put('/api/users/me', requireAuth, (req, res) => {
  const { bio } = req.body;
  db.prepare('UPDATE users SET bio = ? WHERE id = ?').run(bio || '', req.session.userId);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Mini Social Media Platform running at http://localhost:${PORT}`);
});
