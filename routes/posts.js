const express = require('express');
const router = express.Router();
const connectDB = require('../db');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');

router.get('/', async (req, res) => {
  const db = await connectDB();
  const posts = await db.collection('posts').find().toArray();
  res.json(posts);
});

router.post('/', async (req, res) => {
  const db = await connectDB();
  const { name, username, content, title, description, createdAt } = req.body;
  const newPost = {
    name,
    username,
    content,
    title,
    description,
    createdAt,
    likes: []
  }
  const result = await db.collection('posts').insertOne(newPost);
  res.status(201).json({ insertedId: result.insertedId });
});

router.get('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const postId = req.params.id;

    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.get('/mypost/:username', async (req, res) => {
  try {
    const db = await connectDB();
    const userName = req.params.username;

    const postsCursor = db.collection('posts').find({ username: userName });
    const posts = await postsCursor.toArray();

    if (posts.length === 0) {
      return res.status(404).json({ message: 'No posts found for this user' });
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const db = await connectDB();
    const postId = req.params.id;

    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(postId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.delete('/delete/:username', async (req, res) => {
  try {
    const db = await connectDB();
    const userName = req.params.username;

    const result = await db.collection('posts').deleteMany({ username: userName });

    res.json({ message: 'Posts deleted successfully' });
  } catch (error) {
    console.error('Error deleting posts:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


router.put('/update', async (req, res) => {
  try {
    const db = await connectDB();
    const { id, name, username, content, title, description, updatedAt } = req.body;

    if (!id) return res.status(400).json({ error: 'Post ID is required' });

    const { ObjectId } = require('mongodb');
    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          username,
          content,
          title,
          description,
          updatedAt
        }
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Post not found or data unchanged' });
    }

    res.status(200).json({ message: 'Post updated successfully' });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.error("JWT verification failed:", err);
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }

    req.user = user;
    next();
  });
}

router.post('/like/:id', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const postId = req.params.id;
    const username = req.user.username;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const result = await db.collection('posts').updateOne(
      { _id: new ObjectId(postId), likes: { $ne: username } },  // Only like if not already liked
      { $push: { likes: username } }
    );

    if (result.modifiedCount === 0) {
      return res.status(409).json({ message: 'Already liked or post not found' });
    }

    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    res.status(200).json(updatedPost);

  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
router.post('/unlike/:id', authenticateToken, async (req, res) => {
  try {
    const db = await connectDB();
    const postId = req.params.id;
    const username = req.user.username;

    if (!ObjectId.isValid(postId)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    await db.collection('posts').updateOne(
      { _id: new ObjectId(postId) },
      { $pull: { likes: username } }
    );

    const updatedPost = await db.collection('posts').findOne({ _id: new ObjectId(postId) });

    res.status(200).json(updatedPost);

  } catch (error) {
    console.error('Error unliking post:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;