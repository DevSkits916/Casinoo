const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const DATA_FILE = path.join(__dirname, 'balances.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let data = loadData();

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return { players: {} };
    }
    const contents = fs.readFileSync(DATA_FILE, 'utf8');
    if (!contents.trim()) {
      return { players: {} };
    }
    const parsed = JSON.parse(contents);
    if (!parsed.players || typeof parsed.players !== 'object') {
      return { players: {} };
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load balances.json:', err);
    return { players: {} };
  }
}

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save balances.json:', err);
  }
}

function getOrCreatePlayer(username) {
  if (!data.players[username]) {
    data.players[username] = {
      balance: 1000,
      history: []
    };
    saveData();
  }
  return data.players[username];
}

function normalizeUsername(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}

function respondError(res, error, message, status = 400) {
  res.status(status).json({ ok: false, error, message });
}

function appendHistory(player, entry) {
  player.history.push({
    ts: new Date().toISOString(),
    game: entry.game,
    delta: entry.delta,
    desc: typeof entry.desc === 'string' && entry.desc.trim() ? entry.desc : ''
  });
}

function parseInteger(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return NaN;
  }
  return Math.floor(num);
}

app.get('/api/profile', (req, res) => {
  const username = normalizeUsername(req.query.username);
  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  const player = getOrCreatePlayer(username);
  return res.json({ ok: true, username, balance: player.balance });
});

app.post('/api/profile/save', (req, res) => {
  const username = normalizeUsername(req.body.username);
  const balance = parseInteger(req.body.balance);
  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return respondError(res, 'INVALID_BALANCE', 'Balance must be a non-negative integer.');
  }
  const player = getOrCreatePlayer(username);
  player.balance = balance;
  appendHistory(player, { game: 'manual-save', delta: 0, desc: 'session save' });
  saveData();
  return res.json({ ok: true });
});

app.post('/api/game/charge', (req, res) => {
  const username = normalizeUsername(req.body.username);
  const game = typeof req.body.game === 'string' ? req.body.game.trim() : '';
  const amount = parseInteger(req.body.amount);
  const desc = typeof req.body.desc === 'string' ? req.body.desc : '';

  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  if (!game) {
    return respondError(res, 'INVALID_GAME', 'Game name is required.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return respondError(res, 'INVALID_AMOUNT', 'Charge amount must be a positive integer.');
  }

  const player = getOrCreatePlayer(username);
  if (player.balance - amount < 0) {
    return respondError(res, 'INSUFFICIENT_FUNDS', 'Wager exceeds current balance.');
  }

  player.balance -= amount;
  appendHistory(player, { game, delta: -amount, desc: desc || `${game} charge` });
  saveData();
  return res.json({ ok: true, balance: player.balance });
});

app.post('/api/game/payout', (req, res) => {
  const username = normalizeUsername(req.body.username);
  const game = typeof req.body.game === 'string' ? req.body.game.trim() : '';
  const amount = parseInteger(req.body.amount);
  const desc = typeof req.body.desc === 'string' ? req.body.desc : '';

  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  if (!game) {
    return respondError(res, 'INVALID_GAME', 'Game name is required.');
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return respondError(res, 'INVALID_AMOUNT', 'Payout amount must be a positive integer.');
  }

  const player = getOrCreatePlayer(username);
  player.balance += amount;
  appendHistory(player, { game, delta: amount, desc: desc || `${game} payout` });
  saveData();
  return res.json({ ok: true, balance: player.balance });
});

app.get('/api/admin/users', (req, res) => {
  const users = Object.entries(data.players).map(([username, player]) => ({
    username,
    balance: player.balance
  }));
  return res.json({ ok: true, users });
});

app.get('/api/admin/user-detail', (req, res) => {
  const username = normalizeUsername(req.query.username);
  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  const player = getOrCreatePlayer(username);
  return res.json({
    ok: true,
    username,
    balance: player.balance,
    history: player.history
  });
});

app.post('/api/admin/set-balance', (req, res) => {
  const username = normalizeUsername(req.body.username);
  const balance = parseInteger(req.body.balance);
  const note = typeof req.body.note === 'string' && req.body.note.trim() ? req.body.note.trim() : 'admin adjustment';

  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  if (!Number.isFinite(balance) || balance < 0) {
    return respondError(res, 'INVALID_BALANCE', 'Balance must be a non-negative integer.');
  }
  const player = getOrCreatePlayer(username);
  const delta = balance - player.balance;
  player.balance = balance;
  appendHistory(player, { game: 'admin-adjust', delta, desc: note });
  saveData();
  return res.json({ ok: true, balance: player.balance });
});

app.post('/api/admin/delete-user', (req, res) => {
  const username = normalizeUsername(req.body.username);
  if (!username) {
    return respondError(res, 'INVALID_USERNAME', 'Username is required.');
  }
  if (data.players[username]) {
    delete data.players[username];
    saveData();
  }
  return res.json({ ok: true });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Casino prototype server listening on port ${PORT}`);
});
