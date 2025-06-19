const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: String,
  content: String,
  icon: String,
  views: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);
