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
    
    const totalStudents = await User.countDocuments({ role: 'student' });
    const models = [SemesterPerformance, Certification, Internship, Project];
    let verifiedStudents = 0;
    let pendingVerification = 0;
    let rejectedRequests = 0;
    let pendingSemesterResults = 0;
    let pendingCertificates = 0;
    let pendingProjects = 0;

    for (const model of models) {
      const approved = await model.countDocuments({ verification_status: 'approved' });
      const pending = await model.countDocuments({ verification_status: 'pending' });
      const rejected = await model.countDocuments({ verification_status: 'rejected' });
      verifiedStudents += approved;
      pendingVerification += pending;
      rejectedRequests += rejected;

      if (model === SemesterPerformance) pendingSemesterResults = pending;
      if (model === Certification) pendingCertificates = pending;
      if (model === Project) pendingProjects = pending;
    }

    const cgpaAgg = await SemesterPerformance.aggregate([
      { $match: { verification_status: 'approved' } },
      { $group: { _id: null, avgCgpa: { $avg: '$sgpa' } } }
    ]);
    const averageCgpa = cgpaAgg.length > 0 ? cgpaAgg[0].avgCgpa.toFixed(2) : 0;

    const attendanceAgg = await SemesterPerformance.aggregate([
      { $group: { _id: null, avgAttendance: { $avg: '$attendance_percent' } } }
    ]);
    const averageAttendance = attendanceAgg.length > 0 ? Math.round(attendanceAgg[0].avgAttendance) : 0;

    const skillAgg = await Skill.aggregate([
      { $group: { _id: null, avgSkill: { $avg: '$proficiency' } } }
    ]);
    const averageSkillScore = skillAgg.length > 0 ? Math.round(skillAgg[0].avgSkill) : 0;

    const placementReady = await GrowthMetrics.countDocuments({ growth_stage: 'Placement Ready' });
    const studentsAtRisk = await GrowthMetrics.countDocuments({ growth_stage: 'Risk' });
    
    const growthAgg = await GrowthMetrics.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$overall_score' } } }
    ]);
    const aiGrowthScore = growthAgg.length > 0 ? Math.round(growthAgg[0].avgScore) : 0;

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

    recentActivitiesRaw.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = recentActivitiesRaw.slice(0, 5).map(activity => {
      const diffMs = new Date() - new Date(activity.time);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = 'just now';
      if (diffDays > 0) timeStr = `${diffDays} days ago`;
      else if (diffHours > 0) timeStr = `${diffHours} hours ago`;
      else if (diffMins > 0) timeStr = `${diffMins} mins ago`;

      return {
        id: activity.id,
        student: activity.student,
        action: activity.action,
        time: timeStr,
        type: activity.type
      };
    });

    console.log(JSON.stringify({
      totalStudents,
      verifiedStudents,
      pendingVerification,
      rejectedRequests,
      averageCgpa,
      placementReady,
      averageAttendance,
      averageSkillScore,
      aiGrowthScore,
      studentsAtRisk,
      recentActivities,
      quickActions: {
        pendingSemesterResults,
        pendingCertificates,
        pendingProjects
      }
    }, null, 2));

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await mongoose.disconnect();
  }
}

test();
