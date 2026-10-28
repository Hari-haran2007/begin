const mongoose = require('mongoose');
const User = require('./models/User');
const SemesterPerformance = require('./models/SemesterPerformance');
const Certification = require('./models/Certification');
const Internship = require('./models/Internship');
const Project = require('./models/Project');
const GrowthMetrics = require('./models/GrowthMetrics');
const Skill = require('./models/Skill');
require('dotenv').config();

async function test() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond_grades';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const totalStudents = await User.countDocuments({ role: 'student' });
    console.log('Total students:', totalStudents);
    
    // Growth Metrics
    const growthAgg = await GrowthMetrics.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$overall_score' } } }
    ]);
    console.log('Growth agg:', growthAgg);
    
    console.log('Test passed successfully.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
