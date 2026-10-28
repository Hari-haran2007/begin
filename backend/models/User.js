const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Add password for local auth
  roll_number: { type: String, required: true },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
  phone: { type: String },
  avatar_url: { type: String },
  bio: { type: String },
  role: { type: String, enum: ['student', 'staff'], default: 'student' },
  staff_id: { type: String },
  allowComparison: { type: Boolean, default: true },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('User', userSchema);
