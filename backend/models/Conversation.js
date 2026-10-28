const mongoose = require('../db/sqlite');

const ConversationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    type: String,
    default: ''
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  unreadByStudent: {
    type: Number,
    default: 0
  },
  unreadByStaff: {
    type: Number,
    default: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

ConversationSchema.index({ studentId: 1, staffId: 1 }, { unique: true });
ConversationSchema.index({ studentId: 1, lastMessageAt: -1 });
ConversationSchema.index({ staffId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', ConversationSchema);
