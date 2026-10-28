const mongoose = require('mongoose');

const semesterPerformanceSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  semester: { type: Number, required: true },
  sgpa: { type: Number, default: 0 },
  credits_earned: { type: Number, default: 0 },
  credits_total: { type: Number, default: 0 },
  attendance_percent: { type: Number, default: 85 },
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
  cgpa: { type: Number },
  subjects: [{ code: String, name: String, grade: String, gradePoint: Number, credit: Number }],
  student_name: { type: String },
  register_number: { type: String },
  programme: { type: String },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

semesterPerformanceSchema.index({ user_id: 1, semester: 1 }, { unique: true });

// Virtual aliases for camelCase and document types
semesterPerformanceSchema.virtual('performanceId').get(function() { return this._id; });
semesterPerformanceSchema.virtual('studentId').get(function() { return this.user_id; });
semesterPerformanceSchema.virtual('uploadedDocumentUrl').get(function() { return this.file_url; });
semesterPerformanceSchema.virtual('uploadedDocumentType').get(function() { 
  if (this.file_type) return this.file_type;
  if (this.file_url && (this.file_url.includes('application/pdf') || this.file_url.endsWith('.pdf'))) return 'pdf';
  if (this.file_name && this.file_name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return this.file_url ? 'image' : null;
});
semesterPerformanceSchema.virtual('uploadedAt').get(function() { return this.created_at; });
semesterPerformanceSchema.virtual('verificationStatus').get(function() { 
  if (this.verification_status === 'approved' || this.verification_status === 'Verified') return 'Verified';
  if (this.verification_status === 'rejected' || this.verification_status === 'Rejected') return 'Rejected';
  if (this.verification_status === 'reupload' || this.verification_status === 'Re-upload') return 'Re-upload';
  return 'Pending';
});

module.exports = mongoose.model('SemesterPerformance', semesterPerformanceSchema);
