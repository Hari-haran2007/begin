const mongoose = require('mongoose');
const SemesterPerformance = require('./models/SemesterPerformance');
const Skill = require('./models/Skill');
const User = require('./models/User');

mongoose.connect('mongodb://127.0.0.1:27017/beyond_grades').then(async () => {
  try {
    const cgpaAgg = await SemesterPerformance.aggregate([
      { $match: { verification_status: 'approved' } },
      { $group: { _id: null, avgCgpa: { $avg: '$sgpa' } } }
    ]);
    const averageCgpa = (cgpaAgg.length > 0 && cgpaAgg[0].avgCgpa != null) ? parseFloat(cgpaAgg[0].avgCgpa.toFixed(2)) : 0;
    console.log('averageCgpa:', averageCgpa);
    
    const skillAgg = await Skill.aggregate([
      { $group: { _id: null, avgSkill: { $avg: '$proficiency' } } }
    ]);
    const averageSkillScore = (skillAgg.length > 0 && skillAgg[0].avgSkill != null) ? Math.round(skillAgg[0].avgSkill) : 0;
    console.log('averageSkillScore:', averageSkillScore);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    mongoose.disconnect();
  }
});
