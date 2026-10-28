const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  technologies: [{ type: String }],
  github_url: { type: String },
  live_url: { type: String },
  start_date: { type: Date },
  end_date: { type: Date },
  status: { type: String, enum: ['in_progress', 'completed', 'archived'], default: 'completed' },
  verification_status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'reupload', 'Pending', 'Verified', 'Rejected', 'Re-upload'], 
    default: 'Pending' 
  },
  staff_comment: { type: String },
  ai_status: { type: String, enum: ['Original', 'Duplicate', 'Fake', 'Low Quality', 'Missing Information'] },
  ai_confidence_score: { type: Number },
  ai_explanation: { type: String },
  ai_recommendation: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String }, // 'image' | 'pdf'
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual aliases for camelCase and document types
projectSchema.virtual('projectId').get(function() { return this._id; });
projectSchema.virtual('studentId').get(function() { return this.user_id; });
projectSchema.virtual('projectTitle').get(function() { return this.title; });
projectSchema.virtual('uploadedDocumentUrl').get(function() { return this.file_url; });
projectSchema.virtual('uploadedDocumentType').get(function() { 
  if (this.file_type) return this.file_type;
  if (this.file_url && (this.file_url.includes('application/pdf') || this.file_url.endsWith('.pdf'))) return 'pdf';
  if (this.file_name && this.file_name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return this.file_url ? 'image' : null;
});
projectSchema.virtual('uploadedAt').get(function() { return this.created_at; });
projectSchema.virtual('verificationStatus').get(function() { 
  if (this.verification_status === 'approved' || this.verification_status === 'Verified') return 'Verified';
  if (this.verification_status === 'rejected' || this.verification_status === 'Rejected') return 'Rejected';
  if (this.verification_status === 'reupload' || this.verification_status === 'Re-upload') return 'Re-upload';
  return 'Pending';
});

module.exports = mongoose.model('Project', projectSchema);
