const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'recipes.json');

// --- Admin credentials -----------------------------------------------
// Change these if you'd like a different login.
const ADMIN_USERNAME = 'anja';
const ADMIN_PASSWORD = '12345678';
// -----------------------------------------------------------------------

// Valid login tokens live only in server memory. They reset if the
// server restarts, which just means the admin has to log in again.
const validTokens = new Set();

app.use(express.json({ limit: '20mb' })); // generous limit so embedded photos fit

// Since everything lives in one folder, make sure server-side files are
// never served directly to visitors (this would otherwise leak the admin
// password and the raw database file).
const PROTECTED_FILES = ['server.js', 'package.json', 'package-lock.json', 'recipes.json', 'README.txt'];
app.use((req, res, next) => {
  const requested = req.path.replace(/^\/+/, '');
  if (PROTECTED_FILES.includes(requested)) {
    return res.status(404).end();
  }
  next();
});

app.use(express.static(__dirname)); // serves index.html, styles.css, script.js directly

function readRecipes() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function writeRecipes(recipes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
}

function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (token && validTokens.has(token)) return next();
  res.status(401).json({ error: 'Not authorized' });
}

// Anyone can view the recipes.
app.get('/api/recipes', (req, res) => {
  res.json(readRecipes());
});

// Admin login.
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    validTokens.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

app.post('/api/logout', (req, res) => {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  validTokens.delete(token);
  res.json({ ok: true });
});

// Everything below requires a valid admin token.
app.post('/api/recipes', requireAuth, (req, res) => {
  const { name, ingredients, instructions, time, picture } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
  const recipes = readRecipes();
  const recipe = { id: Date.now().toString(), name, ingredients, instructions, time, picture };
  recipes.push(recipe);
  writeRecipes(recipes);
  res.json(recipe);
});

app.put('/api/recipes/:id', requireAuth, (req, res) => {
  const recipes = readRecipes();
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Recipe not found' });
  const { name, ingredients, instructions, time, picture } = req.body || {};
  recipes[idx] = { ...recipes[idx], name, ingredients, instructions, time, picture };
  writeRecipes(recipes);
  res.json(recipes[idx]);
});

app.delete('/api/recipes/:id', requireAuth, (req, res) => {
  const recipes = readRecipes().filter(r => r.id !== req.params.id);
  writeRecipes(recipes);
  res.json({ ok: true });
});

// Bulk replace — used by "Import from file".
app.put('/api/recipes', requireAuth, (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Expected an array' });
  writeRecipes(req.body);
  res.json(req.body);
});

app.listen(PORT, () => {
  console.log(`The Recipe Box is running at http://localhost:${PORT}`);
});
