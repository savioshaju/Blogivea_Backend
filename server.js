const express = require('express');
const cors = require('cors'); 
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');
const summarizeRouter = require('./routes/summarize');

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);
app.use('/api/summarize', summarizeRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
