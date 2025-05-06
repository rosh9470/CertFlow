const { getUserByEmail, createUser } = require('../models/User');

// Simple in‑memory session store (for demo only)
const sessions = {};

function generateSessionId() {
  return Date.now().toString();
}

async function register(req, res) {
  const { name, email, password } = req.body;
  try {
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    const newUserIdResult = await createUser({ name, email, password });
    const newUserId = newUserIdResult.id;
    const newUser = { id: newUserId, name, email, role: 'user' };

    const sessionId = generateSessionId();
    sessions[sessionId] = newUser;

    // Set HTTP‑only cookie so that the session ID is sent on every request
    res.cookie('sessionId', sessionId, { httpOnly: true });
    res.status(201).json({ success: true, user: newUser, sessionId });
  } catch (err) {
    console.error("Error in register:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const user = await getUserByEmail(email);
    // In a real app, compare hashed passwords instead
    if (user && user.password === password) {
      const sessionId = generateSessionId();
      const { password, ...userWithoutPassword } = user;
      sessions[sessionId] = userWithoutPassword;
      res.cookie('sessionId', sessionId, { httpOnly: true });
      res.json({ success: true, user: userWithoutPassword, sessionId });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

function logout(req, res) {
  const sessionId = req.cookies.sessionId;
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
  }
  res.json({ success: true });
}

module.exports = { register, login, logout, sessions };
