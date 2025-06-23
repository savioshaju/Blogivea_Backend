const express = require('express');
const router = express.Router();
const connectDB = require('../db');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');


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

router.get('/', async (req, res) => {
    try {
        const db = await connectDB();
        const comments = await db.collection('comments').find().toArray();
        res.json(comments);
    } catch (err) {
        console.error("GET /comments error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.post('/', authenticateToken, async (req, res) => {
    try {
        const db = await connectDB();
        const { content, createdAt, postId } = req.body;

        if (!postId || !ObjectId.isValid(postId)) {
            return res.status(400).json({ error: 'Invalid or missing postId' });
        }

        const newComment = {
            postId: new ObjectId(postId),
            name: req.user.name,
            username: req.user.username,
            content,
            createdAt
        };

        const result = await db.collection('comments').insertOne(newComment);
        res.status(201).json({ insertedId: result.insertedId });

    } catch (err) {
        console.error("POST /comments error:", err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/postComments/:id', async (req, res) => {
    try {
        const db = await connectDB();
        const postId = req.params.id;

        if (!ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid postId format' });
        }

        const comments = await db.collection('comments')
            .find({ postId: new ObjectId(postId) })
            .sort({ createdAt: -1 }) 
            .toArray();

        if (comments.length === 0) {
            return res.status(404).json({ message: 'No comments found for this post' });
        }

        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
