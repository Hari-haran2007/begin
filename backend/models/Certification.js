const mongoose = require('../db/sqlite');

const certificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  issuer: { type: String, required: true },
  issue_date: { type: Date, required: true },
  expiry_date: { type: Date },
  credential_url: { type: String },
  credential_id: { type: String },
  verification_status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'reupload', 'Pending', 'Verified', 'Rejected', 'Re-upload'], 
    default: 'pending' 
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
}, { 
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual aliases
certificationSchema.virtual('certificateId').get(function() { return this._id; });
certificationSchema.virtual('studentId').get(function() { return this.user_id; });
certificationSchema.virtual('uploadedDocumentUrl').get(function() { return this.file_url; });
certificationSchema.virtual('uploadedDocumentType').get(function() { 
  if (this.file_type) return this.file_type;
  if (this.file_url && (this.file_url.includes('application/pdf') || this.file_url.endsWith('.pdf') || (this.file_name && this.file_name.toLowerCase().endsWith('.pdf')))) return 'pdf';
  return this.file_url ? 'image' : null;
});
certificationSchema.virtual('verificationStatus').get(function() { 
  const lower = (this.verification_status || '').toLowerCase();
  if (lower === 'approved' || lower === 'verified') return 'Verified';
  if (lower === 'rejected') return 'Rejected';
  if (lower === 'reupload' || lower === 're-upload') return 'Re-upload';
  return 'Pending';
});

module.exports = mongoose.model('Certification', certificationSchema);
