const express = require('express');
const cors = require('cors'); // 👈 ADD THIS LINE
const usersRouter = require('./routes/users');
const postsRouter = require('./routes/posts');

const app = express();

app.use(cors()); 
app.use(express.json());
app.use('/api/users', usersRouter);
app.use('/api/posts', postsRouter);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
