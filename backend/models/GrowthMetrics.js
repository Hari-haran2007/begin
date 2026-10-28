const mongoose = require('../db/sqlite');

const growthMetricsSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  overall_score: { type: Number, default: 0 },
  growth_stage: { type: String, enum: ['Risk', 'Medium', 'Good', 'Advanced', 'Placement Ready'], default: 'Medium' },
  marks_score: { type: Number, default: 0 },
  cgpa_score: { type: Number, default: 0 },
  attendance_score: { type: Number, default: 0 },
  technical_skills_score: { type: Number, default: 0 },
  programming_score: { type: Number, default: 0 },
  coding_score: { type: Number, default: 0 },
  projects_score: { type: Number, default: 0 },
  certifications_score: { type: Number, default: 0 },
  internships_score: { type: Number, default: 0 },
  aptitude_score: { type: Number, default: 0 },
  communication_score: { type: Number, default: 0 },
  hackathons_score: { type: Number, default: 0 },
  workshops_score: { type: Number, default: 0 },
  soft_skills_score: { type: Number, default: 0 },
}, { timestamps: { updatedAt: 'updated_at' } });

module.exports = mongoose.model('GrowthMetrics', growthMetricsSchema);
