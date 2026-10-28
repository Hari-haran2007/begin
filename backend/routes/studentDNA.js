const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const SemesterPerformance = require('../models/SemesterPerformance');
const Skill = require('../models/Skill');
const Project = require('../models/Project');
const Certification = require('../models/Certification');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Workshop = require('../models/Workshop');
const DNAAssessment = require('../models/DNAAssessment');
const { calculateStudentDNA } = require('../services/dnaCalculator');

const DIMENSION_KEYS = [
  'problemSolving',
  'leadership',
  'creativity',
  'communication',
  'teamwork',
  'learningSpeed',
  'consistency',
  'placementReadiness'
];

/**
 * GET /api/student-dna
 * Retrieves complete DNA metrics for the authenticated student.
 */
router.get('/', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const studentId = student._id;

    const [
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      selfAssessment,
      staffAssessment
    ] = await Promise.all([
      SemesterPerformance.find({ user_id: studentId }).sort({ semester: 1 }).lean(),
      Skill.find({ user_id: studentId }).lean(),
      Project.find({ user_id: studentId }).lean(),
      Certification.find({ user_id: studentId }).lean(),
      Internship.find({ user_id: studentId }).lean(),
      Hackathon.find({ user_id: studentId }).lean(),
      Workshop.find({ user_id: studentId }).lean(),
      DNAAssessment.findOne({ student_id: studentId, assessment_type: 'self' }).sort({ updated_at: -1 }).lean(),
      DNAAssessment.findOne({ student_id: studentId, assessment_type: 'staff' }).sort({ updated_at: -1 }).lean(),
    ]);

    const result = calculateStudentDNA({
      student,
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      selfAssessment,
      staffAssessment
    });

    res.json(result);
  } catch (error) {
    console.error('Error computing Student DNA:', error);
    res.status(500).json({ error: 'Server error computing Student DNA' });
  }
});

/**
 * POST /api/student-dna/self-assessment
 * Submits or updates the student's self-assessment across the 8 dimensions.
 */
router.post('/self-assessment', auth, async (req, res) => {
  try {
    const student = await User.findById(req.user.id);
    if (!student || student.role !== 'student') {
      return res.status(403).json({ error: 'Only students can submit self-assessments.' });
    }

    const { dimensions, general_remarks } = req.body;
    if (!dimensions || typeof dimensions !== 'object') {
      return res.status(400).json({ error: 'Dimensions assessment object is required.' });
    }

    // Validate that all 8 dimensions are provided and within 0..100
    const validatedDimensions = {};
    let totalScore = 0;

    for (const key of DIMENSION_KEYS) {
      const dim = dimensions[key];
      if (!dim || typeof dim.score !== 'number' || isNaN(dim.score) || dim.score < 0 || dim.score > 100) {
        return res.status(400).json({ 
          error: `Dimension '${key}' must have a valid numerical score between 0 and 100.` 
        });
      }
      validatedDimensions[key] = {
        score: Math.round(dim.score),
        explanation: typeof dim.explanation === 'string' ? dim.explanation.trim() : ''
      };
      totalScore += validatedDimensions[key].score;
    }

    const overallScore = Math.round(totalScore / DIMENSION_KEYS.length);

    let assessment = await DNAAssessment.findOne({ 
      student_id: student._id, 
      assessment_type: 'self' 
    });

    if (assessment) {
      assessment.dimensions = validatedDimensions;
      assessment.overall_score = overallScore;
      assessment.general_remarks = typeof general_remarks === 'string' ? general_remarks.trim() : '';
      assessment.assessed_at = new Date();
      await assessment.save();
    } else {
      assessment = new DNAAssessment({
        student_id: student._id,
        assessment_type: 'self',
        assessor_id: student._id,
        assessor_name: student.full_name || 'Student',
        assessor_role: 'student',
        dimensions: validatedDimensions,
        overall_score: overallScore,
        general_remarks: typeof general_remarks === 'string' ? general_remarks.trim() : '',
        assessed_at: new Date()
      });
      await assessment.save();
    }

    // Return updated DNA calculations
    const [
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      staffAssessment
    ] = await Promise.all([
      SemesterPerformance.find({ user_id: student._id }).sort({ semester: 1 }).lean(),
      Skill.find({ user_id: student._id }).lean(),
      Project.find({ user_id: student._id }).lean(),
      Certification.find({ user_id: student._id }).lean(),
      Internship.find({ user_id: student._id }).lean(),
      Hackathon.find({ user_id: student._id }).lean(),
      Workshop.find({ user_id: student._id }).lean(),
      DNAAssessment.findOne({ student_id: student._id, assessment_type: 'staff' }).sort({ updated_at: -1 }).lean(),
    ]);

    const result = calculateStudentDNA({
      student,
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      selfAssessment: assessment.toObject(),
      staffAssessment
    });

    res.json({
      success: true,
      message: 'Self-assessment saved successfully!',
      dna: result
    });
  } catch (error) {
    console.error('Error saving self-assessment:', error);
    res.status(500).json({ error: 'Server error saving self-assessment.' });
  }
});

module.exports = router;
