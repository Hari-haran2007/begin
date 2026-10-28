const mongoose = require('../db/sqlite');

const workshopSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  organizer: { type: String, required: true },
  date: { type: Date, required: true },
  duration_hours: { type: Number },
  skills_gained: [{ type: String }],
  certificate_url: { type: String },
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String }, // 'image' | 'pdf'
  mode: { type: String, enum: ['online', 'offline'], default: 'online' },
  url: { type: String },
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
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual aliases for camelCase and document types
workshopSchema.virtual('workshopId').get(function() { return this._id; });
workshopSchema.virtual('studentId').get(function() { return this.user_id; });
workshopSchema.virtual('uploadedDocumentUrl').get(function() { return this.file_url || this.certificate_url; });
workshopSchema.virtual('uploadedDocumentType').get(function() { 
  if (this.file_type) return this.file_type;
  const docUrl = this.file_url || this.certificate_url;
  if (docUrl && (docUrl.includes('application/pdf') || docUrl.endsWith('.pdf'))) return 'pdf';
  if (this.file_name && this.file_name.toLowerCase().endsWith('.pdf')) return 'pdf';
  return docUrl ? 'image' : null;
});
workshopSchema.virtual('uploadedAt').get(function() { return this.created_at; });
workshopSchema.virtual('verificationStatus').get(function() { 
  if (this.verification_status === 'approved' || this.verification_status === 'Verified') return 'Verified';
  if (this.verification_status === 'rejected' || this.verification_status === 'Rejected') return 'Rejected';
  if (this.verification_status === 'reupload' || this.verification_status === 'Re-upload') return 'Re-upload';
  return 'Pending';
});

module.exports = mongoose.model('Workshop', workshopSchema);
