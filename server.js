const express = require('express');
const cors = require('cors');
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const summarizeRouter = require('./routes/summarize');
const commentsRouter = require('./routes/comments')

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/summarize', summarizeRouter);
app.use('/api/comment', commentsRouter);


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});