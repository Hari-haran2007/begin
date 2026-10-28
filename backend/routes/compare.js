const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const GrowthMetrics = require('../models/GrowthMetrics');
const Project = require('../models/Project');
const Certification = require('../models/Certification');
const Internship = require('../models/Internship');
const Hackathon = require('../models/Hackathon');
const Workshop = require('../models/Workshop');
const SemesterPerformance = require('../models/SemesterPerformance');
const Skill = require('../models/Skill');
const ComparisonData = require('../models/ComparisonData');

// Search for students allowing comparison
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    
    // Escape regex to prevent 500 errors on special characters
    const escapeRegex = (text) => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(escapeRegex(q), 'i');
    
    // Ensure req.user and req.user.id exist
    if (!req.user || !req.user.id) {
      console.error('Compare Search Error: Authentication missing req.user.id');
      return res.status(401).json({ msg: 'Authentication missing' });
    }

    const students = await User.find({
      role: 'student',
      _id: { $ne: req.user.id },
      $and: [
        {
          $or: [
            { allowComparison: true },
            { allowComparison: { $exists: false } },
            { allowComparison: null }
          ]
        },
        {
          $or: [
            { full_name: regex },
            { roll_number: regex },
            { department: regex }
          ]
        }
      ]
    }).select('full_name department semester roll_number avatar_url').limit(10);
    
    // Safe fallback values for display fields to prevent frontend crashes
    const safeStudents = students.map(s => ({
      _id: s._id,
      full_name: s.full_name || 'Student',
      department: s.department || 'Not available',
      semester: s.semester || 0,
      roll_number: s.roll_number || 'N/A',
      avatar_url: s.avatar_url || ''
    }));

    res.json(safeStudents);
  } catch (err) {
    console.error('Compare Search MongoDB Error:', err);
    res.status(500).json({ msg: 'Unable to search students', error: err.message });
  }
});

// Fetch full comparison data for a specific student
router.get('/:id', auth, async (req, res) => {
  try {
    const studentId = req.params.id;
    
    // Validate permission
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') return res.status(404).json({ msg: 'Student not found' });
    
    // If it's not the current user, check allowComparison
    if (student._id.toString() !== req.user.id) {
      if (student.allowComparison === false) {
        return res.status(403).json({ msg: 'This student has disabled comparison.' });
      }
    }
    
    // Fetch all related data
    const growthMetrics = await GrowthMetrics.findOne({ user_id: studentId });
    const comparisonData = await ComparisonData.findOne({ user_id: studentId });
    const projects = await Project.find({ user_id: studentId });
    const certifications = await Certification.find({ user_id: studentId });
    const internships = await Internship.find({ user_id: studentId });
    const hackathons = await Hackathon.find({ user_id: studentId });
    const workshops = await Workshop.find({ user_id: studentId });
    const semesterPerformances = await SemesterPerformance.find({ user_id: studentId });
    const skills = await Skill.find({ user_id: studentId });
    
    res.json({
      profile: {
        _id: student._id,
        user_id: student._id,
        full_name: student.full_name,
        department: student.department,
        semester: student.semester,
        roll_number: student.roll_number,
        avatar_url: student.avatar_url
      },
      growthMetrics,
      comparisonData,
      counts: {
        projects: projects.length,
        certifications: certifications.length,
        internships: internships.length,
        hackathons: hackathons.length,
        workshops: workshops.length
      },
      skills,
      semesterPerformances
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
