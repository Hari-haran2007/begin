const mongoose = require('mongoose');

const comparisonDataSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cgpa: { type: Number, default: 0 },
  project_count: { type: Number, default: 0 },
  coding_score: { type: Number, default: 0 },
  technical_avg: { type: Number, default: 0 },
  communication_score: { type: Number, default: 0 },
  internship_count: { type: Number, default: 0 },
  certification_count: { type: Number, default: 0 },
  overall_score: { type: Number, default: 0 },
  department: { type: String, required: true },
  semester: { type: Number, required: true },
}, { timestamps: { updatedAt: 'updated_at' } });

module.exports = mongoose.model('ComparisonData', comparisonDataSchema);
