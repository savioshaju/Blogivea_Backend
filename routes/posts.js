const express = require('express');
const router = express.Router();
const connectDB = require('../db');

router.get('/', async (req, res) => {
  const db = await connectDB();
  const posts = await db.collection('posts').find().toArray();
  res.json(posts);
});

router.post('/', async (req, res) => {
  const db = await connectDB();
  const { name, username, content,title, createdAt } = req.body;
  const newPost = {
    name,
    username,
    content,
    title,
    createdAt
  }
  const result = await db.collection('posts').insertOne(newPost);
  res.status(201).json({ insertedId: result.insertedId });
});

module.exports = router;
