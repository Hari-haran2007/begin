const mongoose = require('mongoose');
const User = require('./backend/models/User');
const SemesterPerformance = require('./backend/models/SemesterPerformance');
const Certification = require('./backend/models/Certification');
const Internship = require('./backend/models/Internship');
const Project = require('./backend/models/Project');
const GrowthMetrics = require('./backend/models/GrowthMetrics');
const Skill = require('./backend/models/Skill');
require('dotenv').config({ path: './backend/.env' });

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
    
    const recentActivitiesRaw = [];
    
    const fetchRecent = async (model, actionName) => {
      const items = await model.find().sort({ created_at: -1 }).limit(5).populate('user_id', 'full_name');
      items.forEach(item => {
        if (item.user_id) {
          recentActivitiesRaw.push({
            id: item._id,
            student: item.user_id.full_name,
            action: actionName,
            time: item.created_at || item.updated_at || new Date(),
            type: actionName
          });
        }
      });
    };

    await fetchRecent(SemesterPerformance, 'uploaded Semester Result');
    await fetchRecent(Certification, 'submitted new Certificate');
    await fetchRecent(Internship, 'added an Internship');
    await fetchRecent(Project, 'submitted a Project');
    
    console.log('Recent activities:', recentActivitiesRaw.length);

    console.log('Test passed successfully.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
