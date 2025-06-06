const { ObjectId } = require('mongodb');
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

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });

    req.user = {
      ...payload,
      userId: payload.userId || payload._id?.toString(), 
    };

    next();
  });
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

//Register new user 
router.post('/', async (req, res) => {
  try {
    const db = await connectDB();
    const { name, username, email, password } = req.body;

    if (await db.collection('users').findOne({ username })) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    if (await db.collection('users').findOne({ email })) {
      return res.status(400).json({ error: 'Email already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const newUser = {
      name,
      username,
      email,
      password: hashedPassword,
      userType: 'user',
    };

    const result = await db.collection('users').insertOne(newUser);

    const token = jwt.sign(
      { userId: result.insertedId.toString(), username, userType: newUser.userType },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.status(201).json({ insertedId: result.insertedId, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to insert user' });
  }
});

// current user profile 
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// update current user's profile ---
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const userIdStr = req.user?.userId;

    if (!userIdStr || !ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const userId = new ObjectId(userIdStr);

    const updateFields = {
      name: req.body.name,
      username: req.body.username,
      email: req.body.email
    };

 
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] === undefined) delete updateFields[key];
    });

    if (req.body.password) {
      updateFields.password = await bcrypt.hash(req.body.password, SALT_ROUNDS);
    }

    if (updateFields.username) {
      const existingUser = await db.collection('users').findOne({
        username: updateFields.username,
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    if (updateFields.email) {
      const existingUser = await db.collection('users').findOne({
        email: updateFields.email,
        _id: { $ne: userId }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already taken' });
      }
    }

    console.log('Updating user with:', updateFields);

    const updateResult = await db.collection('users').updateOne(
      { _id: userId },
      { $set: updateFields }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedUser = await db.collection('users').findOne(
      { _id: userId },
      { projection: { password: 0 } }
    );

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error.stack || error);
    res.status(500).json({ message: error.message || 'Server error' });
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
      { userId: user._id.toString(), username: user.username, userType: user.userType },
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
