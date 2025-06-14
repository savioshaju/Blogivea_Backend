const express = require('express');
const router = express.Router();


router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const response = await fetch('https://api-inference.huggingface.co/models/facebook/bart-large-cnn', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || 'Failed to generate summary' });
    }

    const data = await response.json();
    res.json({ summary: data[0]?.summary_text || '' });
  } catch (error) {
    console.error('Error summarizing:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
