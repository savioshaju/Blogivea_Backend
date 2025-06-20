const express = require('express');
const router = express.Router();
const connectDB = require('../db');
const { ObjectId } = require('mongodb');

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
    createdAt
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

module.exports = router;
