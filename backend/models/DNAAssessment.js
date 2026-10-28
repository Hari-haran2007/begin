const mongoose = require('mongoose');

const dimensionAssessmentSchema = new mongoose.Schema({
  score: { 
    type: Number, 
    min: 0, 
    max: 100, 
    required: true 
  },
  explanation: { 
    type: String, 
    default: '' 
  },
  remarks: { 
    type: String, 
    default: '' 
  }
}, { _id: false });

const dnaAssessmentSchema = new mongoose.Schema({
  student_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  assessment_type: { 
    type: String, 
    enum: ['self', 'staff'], 
    required: true, 
    index: true 
  },
  assessor_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  assessor_name: { 
    type: String, 
    default: 'Faculty' 
  },
  assessor_role: { 
    type: String, 
    enum: ['student', 'staff'], 
    default: 'student' 
  },
  
  // The eight standard dimensions
  dimensions: {
    problemSolving: { type: dimensionAssessmentSchema, required: true },
    leadership: { type: dimensionAssessmentSchema, required: true },
    creativity: { type: dimensionAssessmentSchema, required: true },
    communication: { type: dimensionAssessmentSchema, required: true },
    teamwork: { type: dimensionAssessmentSchema, required: true },
    learningSpeed: { type: dimensionAssessmentSchema, required: true },
    consistency: { type: dimensionAssessmentSchema, required: true },
    placementReadiness: { type: dimensionAssessmentSchema, required: true },
  },

  overall_score: { 
    type: Number, 
    min: 0, 
    max: 100 
  },
  general_remarks: { 
    type: String, 
    default: '' 
  },
  assessed_at: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index to quickly fetch or update a student's self or staff assessment
dnaAssessmentSchema.index({ student_id: 1, assessment_type: 1 });

module.exports = mongoose.model('DNAAssessment', dnaAssessmentSchema);
