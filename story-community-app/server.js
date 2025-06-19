require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const Story = require('./models/Story');
const Comment = require('./models/Comment');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// 📚 API TRUYỆN
app.get('/api/stories', async (req, res) => {
  const stories = await Story.find().sort({ createdAt: -1 });
  res.json(stories);
});

app.post('/api/stories', async (req, res) => {
  const story = new Story(req.body);
  await story.save();
  res.json(story);
});

app.get('/api/stories/:id', async (req, res) => {
  const story = await Story.findById(req.params.id);
  if (story) {
    story.views += 1;
    await story.save();
    res.json(story);
  } else {
    res.status(404).json({ error: 'Không tìm thấy truyện' });
  }
});

// 💬 API BÌNH LUẬN CHUNG
app.get('/api/comments', async (req, res) => {
  const comments = await Comment.find().sort({ createdAt: -1 });
  res.json(comments);
});

app.post('/api/comments', async (req, res) => {
  const comment = new Comment(req.body);
  await comment.save();
  res.json(comment);
});

// fallback cho HTML
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'home.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server chạy tại http://localhost:${PORT}`));
