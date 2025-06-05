const express = require('express');
const router = express.Router();
const connectDB = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_here';
const SALT_ROUNDS = 10;


function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}


router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


router.post('/', async (req, res) => {
  try {
    const db = await connectDB();
    const { username, email, password } = req.body;

    if (await db.collection('users').findOne({ username })) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    if (await db.collection('users').findOne({ email })) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      username,
      email,
      password: hashedPassword,
      userType: 'user',
    };

    const result = await db.collection('users').insertOne(newUser);

    const token = jwt.sign(
      { userId: result.insertedId, username, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ insertedId: result.insertedId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert user' });
  }
});


router.post('/login', async (req, res) => {
  try {
    const db = await connectDB();
    const { username, password } = req.body;

    const user = await db.collection('users').findOne({ username });

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username, userType: user.userType },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
