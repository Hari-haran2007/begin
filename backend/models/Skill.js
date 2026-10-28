const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  skill_name: { type: String, required: true },
  skill_type: { type: String, enum: ['technical', 'programming', 'soft', 'communication'], required: true },
  proficiency: { type: Number, required: true },
  verification_status: { type: String, enum: ['pending', 'approved', 'rejected', 'reupload'], default: 'approved' },
  staff_comment: { type: String },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Skill', skillSchema);
