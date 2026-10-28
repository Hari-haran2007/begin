const mongoose = require('../db/sqlite');

const internshipSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true },
  role: { type: String, required: true },
  description: { type: String },
  start_date: { type: Date, required: true },
  end_date: { type: Date },
  is_current: { type: Boolean, default: false },
  skills: [{ type: String }],
  stipend: { type: Number },
  location: { type: String },
  work_type: { type: String, enum: ['remote', 'onsite', 'hybrid'] },
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
  mode: { type: String, enum: ['online', 'offline'], default: 'online' },
  url: { type: String },
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual aliases for camelCase fields
internshipSchema.virtual('internshipId').get(function() { return this._id; });
internshipSchema.virtual('studentId').get(function() { return this.user_id; });
internshipSchema.virtual('companyName').get(function() { return this.company; });
internshipSchema.virtual('internshipRole').get(function() { return this.role; });
internshipSchema.virtual('startDate').get(function() { return this.start_date; });
internshipSchema.virtual('endDate').get(function() { return this.end_date; });
internshipSchema.virtual('uploadedDocumentUrl').get(function() { return this.file_url; });
internshipSchema.virtual('uploadedDocumentType').get(function() { 
  if (this.file_type) return this.file_type;
  if (this.file_url && (this.file_url.includes('application/pdf') || this.file_url.endsWith('.pdf'))) return 'pdf';
  return this.file_url ? 'image' : null;
});
internshipSchema.virtual('uploadedAt').get(function() { return this.created_at; });
internshipSchema.virtual('verificationStatus').get(function() { 
  if (this.verification_status === 'approved' || this.verification_status === 'Verified') return 'Verified';
  if (this.verification_status === 'rejected' || this.verification_status === 'Rejected') return 'Rejected';
  if (this.verification_status === 'reupload' || this.verification_status === 'Re-upload') return 'Re-upload';
  return 'Pending';
});

module.exports = mongoose.model('Internship', internshipSchema);

