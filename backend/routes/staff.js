const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SemesterPerformance = require('../models/SemesterPerformance');
const Certification = require('../models/Certification');
const Internship = require('../models/Internship');
const Project = require('../models/Project');
const GrowthMetrics = require('../models/GrowthMetrics');
const Skill = require('../models/Skill');
const Hackathon = require('../models/Hackathon');
const Workshop = require('../models/Workshop');
const StaffNotification = require('../models/StaffNotification');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const DNAAssessment = require('../models/DNAAssessment');
const { calculateStudentDNA } = require('../services/dnaCalculator');
const auth = require('../middleware/auth');

// Helper to check staff role
const checkStaff = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User identity missing' });
    }
    const user = await User.findById(userId);
    if (!user || user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied: Staff only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error verifying staff authorization' });
  }
};

/**
 * 1. DASHBOARD STATS
 * GET /api/staff/dashboard-stats and /api/staff/dashboard
 */
const getDashboardStats = async (req, res) => {
  try {
    // 1. Fetch only registered students
    const students = await User.find({ role: 'student' }).select('-password').lean();
    const totalStudents = students.length;
    const validStudentObjectIds = students.map(s => s._id);

    // Helpers for status matching (case-insensitive and handling variations)
    const isVerifiedStatus = (status) => /^(approved|verified)$/i.test(status || '');
    const isPendingStatus = (status) => /^pending$/i.test(status || '');
    const isRejectedStatus = (status) => /^(rejected|reupload|re-upload)$/i.test(status || '');

    // Fetch all submissions strictly belonging to existing registered students
    const [semesters, certs, internships, projects, hackathons, workshops, skills] = await Promise.all([
      SemesterPerformance.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Certification.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Internship.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Project.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Hackathon.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Workshop.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Skill.find({ user_id: { $in: validStudentObjectIds } }).lean()
    ]);

    const allSubmissions = [
      ...semesters,
      ...certs,
      ...internships,
      ...projects,
      ...hackathons,
      ...workshops
    ];

    const verifiedStudents = allSubmissions.filter(s => isVerifiedStatus(s.verification_status)).length;
    const pendingVerification = allSubmissions.filter(s => isPendingStatus(s.verification_status)).length;
    const rejectedRequests = allSubmissions.filter(s => isRejectedStatus(s.verification_status)).length;

    // Detailed pending counts for Quick Actions
    const quickActions = {
      pendingSemesterResults: semesters.filter(s => isPendingStatus(s.verification_status)).length,
      pendingCertificates: certs.filter(s => isPendingStatus(s.verification_status)).length,
      pendingInternships: internships.filter(s => isPendingStatus(s.verification_status)).length,
      pendingProjects: projects.filter(s => isPendingStatus(s.verification_status)).length,
      pendingHackathons: hackathons.filter(s => isPendingStatus(s.verification_status)).length,
      pendingWorkshops: workshops.filter(s => isPendingStatus(s.verification_status)).length,
    };

    // Calculate Average CGPA: strictly from valid positive student semester records
    let totalCgpa = 0;
    let cgpaCount = 0;
    semesters.forEach(p => {
      const val = Number(p.cgpa || p.sgpa);
      if (!isNaN(val) && val > 0) {
        totalCgpa += val;
        cgpaCount++;
      }
    });
    const averageCgpa = cgpaCount > 0 ? (totalCgpa / cgpaCount).toFixed(2) : 'N/A';

    // Calculate Average Skill Score: strictly from actual registered student skill records
    let totalSkill = 0;
    let skillCount = 0;
    skills.forEach(s => {
      const prof = Number(s.proficiency);
      if (!isNaN(prof) && prof > 0) {
        totalSkill += prof;
        skillCount++;
      }
    });
    const averageSkillScore = skillCount > 0 ? Math.round(totalSkill / skillCount) : null;

    // Growth & Assessment data strictly for registered students
    const [growthDocs, dnaAssessments] = await Promise.all([
      GrowthMetrics.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      DNAAssessment.find({ student_id: { $in: validStudentObjectIds } }).lean()
    ]);

    const growthMap = new Map(growthDocs.map(g => [g.user_id.toString(), g]));
    const dnaMap = new Map();
    dnaAssessments.forEach(d => {
      const sid = d.student_id.toString();
      if (!dnaMap.has(sid)) dnaMap.set(sid, []);
      dnaMap.get(sid).push(d);
    });

    // Calculate distinct Placement Ready and Students at Risk
    let placementReady = 0;
    let studentsAtRiskCount = 0;
    let studentsWithAssessmentCount = 0;

    students.forEach(student => {
      const sid = student._id.toString();
      const gm = growthMap.get(sid);
      const studentSems = semesters.filter(s => s.user_id.toString() === sid);
      const studentSkills = skills.filter(s => s.user_id.toString() === sid);
      const studentDnas = dnaMap.get(sid) || [];
      const staffDna = studentDnas.find(d => d.assessment_type === 'staff');
      const selfDna = studentDnas.find(d => d.assessment_type === 'self');

      const validCgpas = studentSems.map(s => Number(s.cgpa || s.sgpa)).filter(v => !isNaN(v) && v > 0);
      const latestCgpa = validCgpas.length > 0 ? validCgpas[validCgpas.length - 1] : 0;
      const evaluatedGrowthScore = (gm && typeof gm.overall_score === 'number' && gm.overall_score > 0) ? gm.overall_score : null;

      const hasAssessmentData = validCgpas.length > 0 || studentSkills.length > 0 || evaluatedGrowthScore !== null || Boolean(staffDna || selfDna);
      if (hasAssessmentData) {
        studentsWithAssessmentCount++;
      }

      // Project's placement readiness criteria:
      // growth_stage is 'Placement Ready' OR overall score is >= 70 (from GrowthMetrics or Staff DNA evaluation)
      const isPlacementReady = 
        (gm && gm.growth_stage === 'Placement Ready') ||
        (evaluatedGrowthScore !== null && evaluatedGrowthScore >= 70) ||
        (staffDna && typeof staffDna.overall_score === 'number' && staffDna.overall_score >= 70);

      if (isPlacementReady) {
        placementReady++;
      }

      // Risk assessment criteria (applied only if student has assessment data; never invent risk status for unassessed students)
      if (hasAssessmentData) {
        const isRisk = 
          (gm && gm.growth_stage === 'Risk') ||
          (evaluatedGrowthScore !== null && evaluatedGrowthScore < 40) ||
          (latestCgpa > 0 && latestCgpa < 6.0) ||
          (staffDna && typeof staffDna.overall_score === 'number' && staffDna.overall_score < 40);

        if (isRisk) {
          studentsAtRiskCount++;
        }
      }
    });

    const studentsAtRisk = studentsWithAssessmentCount > 0 ? studentsAtRiskCount : 'Not assessed';

    // AI Growth Score: only if valid implemented growth scores (> 0) exist
    const validGrowthScores = growthDocs.map(g => g.overall_score).filter(s => typeof s === 'number' && s > 0);
    const aiGrowthScore = validGrowthScores.length > 0 ? Math.round(validGrowthScores.reduce((a, b) => a + b, 0) / validGrowthScores.length) : null;

    // Recent Activities (real submissions from registered students)
    const recentActivitiesRaw = [];
    const fetchRecent = async (model, actionName, type, verificationRoute) => {
      const items = await model.find({ user_id: { $in: validStudentObjectIds } })
        .sort({ created_at: -1, updatedAt: -1 })
        .limit(6)
        .populate('user_id', 'full_name roll_number department')
        .lean();
      items.forEach(item => {
        if (item.user_id) {
          recentActivitiesRaw.push({
            id: item._id,
            studentId: item.user_id._id,
            student: item.user_id.full_name || 'Student',
            roll_number: item.user_id.roll_number || '',
            department: item.user_id.department || '',
            action: `${actionName}${item.semester ? ` (Sem ${item.semester})` : item.name ? ` - ${item.name}` : item.title ? ` - ${item.title}` : item.company ? ` - ${item.company}` : ''}`,
            time: item.created_at || item.updated_at || item.createdAt || new Date(),
            type,
            verificationRoute
          });
        }
      });
    };

    await Promise.all([
      fetchRecent(SemesterPerformance, 'uploaded Semester Result', 'Semester Result', '/staff/semester-results'),
      fetchRecent(Certification, 'submitted Certificate', 'Certificate', '/staff/certificates'),
      fetchRecent(Internship, 'added Internship', 'Internship', '/staff/internships'),
      fetchRecent(Project, 'submitted Project', 'Project', '/staff/projects'),
      fetchRecent(Hackathon, 'submitted Hackathon', 'Hackathon', '/staff/hackathons'),
      fetchRecent(Workshop, 'submitted Workshop', 'Workshop', '/staff/workshops'),
    ]);

    recentActivitiesRaw.sort((a, b) => new Date(b.time) - new Date(a.time));
    const recentActivities = recentActivitiesRaw.slice(0, 8).map(activity => {
      const diffMs = new Date() - new Date(activity.time);
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      let timeStr = 'just now';
      if (diffDays > 0) timeStr = `${diffDays}d ago`;
      else if (diffHours > 0) timeStr = `${diffHours}h ago`;
      else if (diffMins > 0) timeStr = `${diffMins}m ago`;

      return {
        ...activity,
        time: timeStr
      };
    });

    res.json({
      totalStudents,
      verifiedStudents,
      pendingVerification,
      rejectedRequests,
      averageCgpa,
      placementReady,
      averageSkillScore,
      aiGrowthScore,
      studentsAtRisk,
      recentActivities,
      quickActions
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Server error fetching stats' });
  }
};

router.get('/dashboard-stats', auth, checkStaff, getDashboardStats);
router.get('/dashboard', auth, checkStaff, getDashboardStats);

/**
 * 2. STUDENT MANAGEMENT
 * GET /api/staff/students
 */
router.get('/students', auth, checkStaff, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').lean();
    const [growthMetrics, semesterPerformances, allSkills, allCerts, allInterns, allProjs] = await Promise.all([
      GrowthMetrics.find().lean(),
      SemesterPerformance.find().lean(),
      Skill.find().lean(),
      Certification.find().lean(),
      Internship.find().lean(),
      Project.find().lean(),
    ]);

    const growthMap = new Map();
    growthMetrics.forEach(gm => {
      if (gm && gm.user_id) growthMap.set(gm.user_id.toString(), gm);
    });

    const perfMap = new Map();
    semesterPerformances.forEach(perf => {
      if (perf && perf.user_id) {
        const uId = perf.user_id.toString();
        if (!perfMap.has(uId)) perfMap.set(uId, []);
        perfMap.get(uId).push(perf);
      }
    });

    const skillCountMap = new Map();
    allSkills.forEach(s => {
      if (s.user_id) {
        const uId = s.user_id.toString();
        skillCountMap.set(uId, (skillCountMap.get(uId) || 0) + 1);
      }
    });

    const certCountMap = new Map();
    allCerts.forEach(c => {
      if (c.user_id) {
        const uId = c.user_id.toString();
        certCountMap.set(uId, (certCountMap.get(uId) || 0) + 1);
      }
    });

    const mergedData = students.map(student => {
      const sId = student._id.toString();
      const gm = growthMap.get(sId) || null;
      
      let latestPerf = null;
      const perfs = perfMap.get(sId);
      if (perfs && perfs.length > 0) {
        latestPerf = perfs.sort((a, b) => b.semester - a.semester)[0];
      }

      return {
        ...student,
        id: student._id,
        user_id: student._id,
        growth_metrics: gm,
        latest_performance: latestPerf,
        skills_count: skillCountMap.get(sId) || 0,
        certificates_count: certCountMap.get(sId) || 0,
      };
    });

    res.json(mergedData);
  } catch (error) {
    console.error('[STAFF API ERROR] /students', error);
    res.status(500).json({ error: 'Server error fetching students', details: error.message });
  }
});

/**
 * GET /api/staff/students/:id
 */
router.get('/students/:id', auth, checkStaff, async (req, res) => {
  try {
    const userId = req.params.id;
    const student = await User.findOne({ _id: userId, role: 'student' }).select('-password').lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const [growthMetrics, semesterPerformances, certificates, internships, projects, skills, hackathons, workshops] = await Promise.all([
      GrowthMetrics.findOne({ user_id: userId }).lean(),
      SemesterPerformance.find({ user_id: userId }).sort({ semester: -1 }).lean(),
      Certification.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Internship.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Project.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Skill.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Hackathon.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Workshop.find({ user_id: userId }).sort({ created_at: -1 }).lean()
    ]);

    res.json({
      profile: {
        ...student,
        id: student._id,
        user_id: student._id
      },
      growth: growthMetrics || null,
      semesters: semesterPerformances || [],
      certificates: certificates || [],
      internships: internships || [],
      projects: projects || [],
      skills: skills || [],
      hackathons: hackathons || [],
      workshops: workshops || []
    });
  } catch (error) {
    console.error('[STAFF API ERROR] GET /students/:id', error);
    res.status(500).json({ error: 'Server error fetching student details' });
  }
});

/**
 * GET /api/staff/students/:id/documents
 * Fetch all verification documents for a specific student
 */
router.get('/students/:id/documents', auth, checkStaff, async (req, res) => {
  try {
    const userId = req.params.id;
    const student = await User.findOne({ _id: userId, role: 'student' }).select('-password').lean();
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const [certs, interns, projs, skills, sems] = await Promise.all([
      Certification.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Internship.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Project.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      Skill.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
      SemesterPerformance.find({ user_id: userId }).sort({ semester: -1 }).lean(),
    ]);

    const normalizeStatus = (raw) => {
      const lower = (raw || 'pending').toLowerCase();
      if (lower === 'approved' || lower === 'verified') return { status: 'approved', display: 'Verified' };
      if (lower === 'rejected') return { status: 'rejected', display: 'Rejected' };
      if (lower === 'reupload' || lower === 're-upload') return { status: 'reupload', display: 'Re-upload' };
      return { status: 'pending', display: 'Pending' };
    };

    const documents = [];

    // 1. Certificates
    certs.forEach(c => {
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        c.file_url?.includes('application/pdf') || 
        c.file_url?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        c.file_url?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        c.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);
      const norm = normalizeStatus(c.verification_status);

      documents.push({
        id: c._id.toString(),
        _id: c._id.toString(),
        category: 'certificates',
        categoryLabel: 'Certificate',
        title: c.name,
        subtitle: c.issuer || 'Official Certification',
        date: c.created_at || c.issue_date,
        file_url: c.file_url || null,
        documentUrl: c.file_url ? `/api/certifications/${c._id}/document` : null,
        file_name: c.file_name || (detectedType === 'pdf' ? `${c.name || 'certificate'}.pdf` : detectedType === 'image' ? `${c.name || 'certificate'}.png` : null),
        file_type: detectedType,
        isPdf,
        isImage,
        verification_status: norm.status,
        status: norm.display,
        staff_comment: c.staff_comment || '',
        externalUrl: c.credential_url || null,
        credential_id: c.credential_id || null,
        verifyEndpoint: `/api/staff/certificates/${c._id}`
      });
    });

    // 2. Internships
    interns.forEach(i => {
      const isPdf = Boolean(
        i.file_type === 'pdf' || 
        i.file_url?.includes('application/pdf') || 
        i.file_url?.endsWith('.pdf') || 
        i.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        i.file_type === 'image' ||
        i.file_url?.startsWith('data:image/') ||
        i.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        i.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);
      const norm = normalizeStatus(i.verification_status);

      documents.push({
        id: i._id.toString(),
        _id: i._id.toString(),
        category: 'internships',
        categoryLabel: 'Internship Proof',
        title: `${i.company} - ${i.role}`,
        subtitle: `${i.work_type ? i.work_type.charAt(0).toUpperCase() + i.work_type.slice(1) + ' Internship' : 'Internship Experience'}`,
        date: i.created_at || i.start_date,
        file_url: i.file_url || null,
        documentUrl: i.file_url ? `/api/internships/${i._id}/document` : null,
        file_name: i.file_name || (detectedType === 'pdf' ? `${i.company}_document.pdf` : detectedType === 'image' ? `${i.company}_document.png` : null),
        file_type: detectedType,
        isPdf,
        isImage,
        verification_status: norm.status,
        status: norm.display,
        staff_comment: i.staff_comment || '',
        externalUrl: i.url || null,
        verifyEndpoint: `/api/staff/internships/${i._id}`
      });
    });

    // 3. Projects
    projs.forEach(p => {
      const isPdf = Boolean(p.file_url?.includes('application/pdf') || p.file_url?.endsWith('.pdf'));
      const isImage = Boolean(p.file_url?.startsWith('data:image/') || p.file_url?.match(/\.(jpe?g|png|webp)/i));
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);
      const norm = normalizeStatus(p.verification_status);

      documents.push({
        id: p._id.toString(),
        _id: p._id.toString(),
        category: 'projects',
        categoryLabel: 'Project Document',
        title: p.title,
        subtitle: p.technologies?.length ? p.technologies.join(', ') : (p.status ? `Status: ${p.status}` : 'Student Project'),
        date: p.created_at,
        file_url: p.file_url || null,
        documentUrl: p.file_url || null,
        file_name: p.file_url ? `${p.title.replace(/\s+/g, '_')}_document${isPdf ? '.pdf' : '.png'}` : null,
        file_type: detectedType,
        isPdf,
        isImage,
        verification_status: norm.status,
        status: norm.display,
        staff_comment: p.staff_comment || '',
        externalUrl: p.github_url || p.live_url || null,
        verifyEndpoint: `/api/staff/projects/${p._id}`
      });
    });

    // 4. Skills
    skills.forEach(s => {
      const norm = normalizeStatus(s.verification_status);

      documents.push({
        id: s._id.toString(),
        _id: s._id.toString(),
        category: 'skills',
        categoryLabel: 'Skill Evidence',
        title: s.skill_name,
        subtitle: `Proficiency: ${s.proficiency}% (${s.skill_type || 'Skill'})`,
        date: s.created_at,
        file_url: null,
        documentUrl: null,
        file_name: null,
        file_type: null,
        isPdf: false,
        isImage: false,
        verification_status: norm.status,
        status: norm.display,
        staff_comment: s.staff_comment || '',
        externalUrl: null,
        verifyEndpoint: `/api/staff/skills/${s._id}`
      });
    });

    // 5. Semester Performance / Academics
    sems.forEach(sem => {
      const isPdf = Boolean(sem.file_url?.includes('application/pdf') || sem.file_url?.endsWith('.pdf'));
      const isImage = Boolean(sem.file_url?.startsWith('data:image/') || sem.file_url?.match(/\.(jpe?g|png|webp)/i));
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);
      const norm = normalizeStatus(sem.verification_status);

      documents.push({
        id: sem._id.toString(),
        _id: sem._id.toString(),
        category: 'academics',
        categoryLabel: 'Semester Marksheet',
        title: `Semester ${sem.semester} Result`,
        subtitle: `SGPA: ${sem.sgpa || 'N/A'} | Credits: ${sem.credits_earned || sem.credits_total || 0}`,
        date: sem.created_at,
        file_url: sem.file_url || null,
        documentUrl: sem.file_url || null,
        file_name: sem.file_url ? `Semester_${sem.semester}_marksheet${isPdf ? '.pdf' : '.png'}` : null,
        file_type: detectedType,
        isPdf,
        isImage,
        verification_status: norm.status,
        status: norm.display,
        staff_comment: sem.staff_comment || '',
        externalUrl: null,
        verifyEndpoint: `/api/staff/academic-verification/${sem._id}`
      });
    });

    const counts = {
      total: documents.length,
      certificates: documents.filter(d => d.category === 'certificates').length,
      internships: documents.filter(d => d.category === 'internships').length,
      projects: documents.filter(d => d.category === 'projects').length,
      skills: documents.filter(d => d.category === 'skills').length,
      academics: documents.filter(d => d.category === 'academics').length,
      pending: documents.filter(d => d.verification_status === 'pending').length,
      verified: documents.filter(d => d.verification_status === 'approved').length,
      rejected: documents.filter(d => d.verification_status === 'rejected').length,
      reupload: documents.filter(d => d.verification_status === 'reupload').length,
    };

    res.json({
      student: {
        id: student._id,
        _id: student._id,
        full_name: student.full_name,
        roll_number: student.roll_number,
        department: student.department,
        semester: student.semester,
        email: student.email,
        avatar_url: student.avatar_url
      },
      counts,
      documents
    });
  } catch (error) {
    console.error('[STAFF API ERROR] /students/:id/documents', error);
    res.status(500).json({ error: 'Server error fetching student documents' });
  }
});

/**
 * 3. SEMESTER RESULTS (ACADEMIC VERIFICATION)
 */
const getSemesterResultsHandler = async (req, res) => {
  try {
    const perfs = await SemesterPerformance.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email semester').lean();
    const result = perfs.map(p => {
      const isPdf = Boolean(
        p.file_type === 'pdf' || 
        p.file_url?.includes('application/pdf') || 
        p.file_url?.endsWith('.pdf') || 
        p.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        p.file_type === 'image' ||
        p.file_url?.startsWith('data:image/') ||
        p.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        p.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'Pending';
      if (p.verification_status === 'approved' || p.verification_status === 'Verified') {
        normStatus = 'Verified';
      } else if (p.verification_status === 'rejected' || p.verification_status === 'Rejected') {
        normStatus = 'Rejected';
      } else if (p.verification_status === 'reupload' || p.verification_status === 'Re-upload') {
        normStatus = 'Re-upload';
      }

      return {
        ...p,
        id: p._id,
        _id: p._id,
        performanceId: p._id,
        student_name: p.user_id?.full_name || p.student_name || 'Unknown',
        studentName: p.user_id?.full_name || p.student_name || 'Unknown',
        roll_number: p.user_id?.roll_number || p.register_number || 'N/A',
        studentRollNumber: p.user_id?.roll_number || p.register_number || 'N/A',
        department: p.user_id?.department || p.programme || 'N/A',
        student_id: p.user_id?._id || p.user_id,
        studentId: p.user_id?._id || p.user_id,
        semester: p.semester,
        sgpa: p.sgpa != null ? p.sgpa : null,
        cgpa: p.cgpa != null ? p.cgpa : null,
        credits_earned: p.credits_earned || p.credits_total || p.credits || 0,
        credits_total: p.credits_total || p.credits_earned || p.credits || 0,
        attendance_percent: p.attendance_percent || 85,
        subjects: Array.isArray(p.subjects) ? p.subjects : [],
        file_url: p.file_url || null,
        uploadedDocumentUrl: p.file_url || null,
        file_name: p.file_name || (detectedType === 'pdf' ? `semester_${p.semester}_marksheet.pdf` : `semester_${p.semester}_marksheet.png`),
        file_type: detectedType,
        uploadedDocumentType: detectedType,
        documentUrl: `/api/semesterPerformances/${p._id}/document`,
        verification_status: normStatus,
        verificationStatus: normStatus,
        staff_comment: p.staff_comment || '',
        rejectionReason: p.staff_comment || '',
        created_at: p.created_at,
        uploadedAt: p.created_at
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching semester results for staff:', error);
    res.status(500).json({ error: 'Server error fetching semester results' });
  }
};

router.get('/semester-results', auth, checkStaff, getSemesterResultsHandler);
router.get('/academic-verification', auth, checkStaff, getSemesterResultsHandler);

router.get('/semester-results/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/semesterPerformances/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

router.get('/academic-verification/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/semesterPerformances/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

const updateSemesterResultHandler = async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await SemesterPerformance.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email semester');

    if (!item) {
      return res.status(404).json({ error: 'Semester result record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating semester result status:', error);
    res.status(500).json({ error: 'Server error updating semester result' });
  }
};

router.put('/semester-results/:id', auth, checkStaff, updateSemesterResultHandler);
router.patch('/semester-results/:id', auth, checkStaff, updateSemesterResultHandler);
router.put('/academic-verification/:id', auth, checkStaff, updateSemesterResultHandler);
router.patch('/academic-verification/:id', auth, checkStaff, updateSemesterResultHandler);

/**
 * 4. CERTIFICATES
 */
router.get('/certificates', auth, checkStaff, async (req, res) => {
  try {
    const items = await Certification.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email').lean();
    const result = items.map(c => {
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        c.file_url?.includes('application/pdf') || 
        c.file_url?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        c.file_url?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        c.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'pending';
      const rawStatus = (c.verification_status || '').toLowerCase();
      if (rawStatus === 'approved' || rawStatus === 'verified') {
        normStatus = 'approved';
      } else if (rawStatus === 'rejected') {
        normStatus = 'rejected';
      } else if (rawStatus === 'reupload' || rawStatus === 're-upload') {
        normStatus = 'reupload';
      }

      const displayStatus = normStatus === 'approved' ? 'Verified' : (normStatus === 'rejected' ? 'Rejected' : (normStatus === 'reupload' ? 'Re-upload' : 'Pending'));

      return {
        ...c,
        id: c._id,
        _id: c._id,
        certificateId: c._id,
        student_name: c.user_id?.full_name || 'Unknown',
        studentName: c.user_id?.full_name || 'Unknown',
        roll_number: c.user_id?.roll_number || 'N/A',
        studentRollNumber: c.user_id?.roll_number || 'N/A',
        department: c.user_id?.department || 'N/A',
        student_id: c.user_id?._id || c.user_id,
        studentId: c.user_id?._id || c.user_id,
        uploadedDocumentUrl: c.file_url || null,
        uploadedDocumentType: detectedType,
        file_url: c.file_url || null,
        file_type: detectedType,
        isPdf,
        isImage,
        documentUrl: `/api/certifications/${c._id}/document`,
        file_name: c.file_name || (detectedType === 'pdf' ? `${c.name || 'certificate'}.pdf` : detectedType === 'image' ? `${c.name || 'certificate'}.png` : null),
        verification_status: normStatus,
        verificationStatus: displayStatus,
        status: displayStatus,
        staff_comment: c.staff_comment || '',
        rejectionReason: c.staff_comment || '',
        mode: c.mode || (c.credential_url ? 'online' : 'offline')
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching certificates for staff:', error);
    res.status(500).json({ error: 'Server error fetching certificates' });
  }
});

router.get('/certificates/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/certifications/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

router.put('/certificates/:id', auth, checkStaff, async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'approved';
      else if (lower === 'rejected') normStatus = 'rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'reupload';
      else normStatus = 'pending';
    }

    if (normStatus === 'rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Certification.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment ? rawComment.trim() : '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email');

    if (!item) {
      return res.status(404).json({ error: 'Certificate record not found' });
    }

    const displayStatus = normStatus === 'approved' ? 'Verified' : (normStatus === 'rejected' ? 'Rejected' : (normStatus === 'reupload' ? 'Re-upload' : 'Pending'));

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: displayStatus,
      status: displayStatus,
      staff_comment: rawComment ? rawComment.trim() : '',
      rejectionReason: rawComment ? rawComment.trim() : ''
    });
  } catch (error) {
    console.error('Error updating certificate status:', error);
    res.status(500).json({ error: 'Server error updating certificate' });
  }
});

/**
 * 5. INTERNSHIPS
 */
router.get('/internships', auth, checkStaff, async (req, res) => {
  try {
    const items = await Internship.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email').lean();
    const result = items.map(c => {
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        c.file_url?.includes('application/pdf') || 
        c.file_url?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        c.file_url?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        c.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'Pending';
      if (c.verification_status === 'approved' || c.verification_status === 'Verified') {
        normStatus = 'Verified';
      } else if (c.verification_status === 'rejected' || c.verification_status === 'Rejected') {
        normStatus = 'Rejected';
      } else if (c.verification_status === 'reupload' || c.verification_status === 'Re-upload') {
        normStatus = 'Re-upload';
      }

      return {
        ...c,
        id: c._id,
        _id: c._id,
        internshipId: c._id,
        student_name: c.user_id?.full_name || 'Unknown',
        studentName: c.user_id?.full_name || 'Unknown',
        roll_number: c.user_id?.roll_number || 'N/A',
        studentRollNumber: c.user_id?.roll_number || 'N/A',
        department: c.user_id?.department || 'N/A',
        student_id: c.user_id?._id || c.user_id,
        studentId: c.user_id?._id || c.user_id,
        companyName: c.company,
        internshipRole: c.role,
        startDate: c.start_date,
        endDate: c.end_date,
        uploadedDocumentUrl: c.file_url || null,
        uploadedDocumentType: detectedType,
        file_url: c.file_url || null,
        file_type: detectedType,
        documentUrl: `/api/internships/${c._id}/document`,
        file_name: c.file_name || (detectedType === 'pdf' ? 'internship.pdf' : detectedType === 'image' ? 'internship.png' : null),
        verification_status: normStatus,
        verificationStatus: normStatus,
        staff_comment: c.staff_comment || '',
        rejectionReason: c.staff_comment || '',
        mode: c.mode || (c.url ? 'online' : 'offline')
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching internships for staff:', error);
    res.status(500).json({ error: 'Server error fetching internships' });
  }
});

router.get('/internships/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/internships/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

router.put('/internships/:id', auth, checkStaff, async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Internship.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email');

    if (!item) {
      return res.status(404).json({ error: 'Internship record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating internship status:', error);
    res.status(500).json({ error: 'Server error updating internship' });
  }
});

/**
 * 6. PROJECTS
 */
router.get('/projects', auth, checkStaff, async (req, res) => {
  try {
    const items = await Project.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email semester').lean();
    const result = items.map(c => {
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        c.file_url?.includes('application/pdf') || 
        c.file_url?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        c.file_url?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        c.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'Pending';
      if (c.verification_status === 'approved' || c.verification_status === 'Verified') {
        normStatus = 'Verified';
      } else if (c.verification_status === 'rejected' || c.verification_status === 'Rejected') {
        normStatus = 'Rejected';
      } else if (c.verification_status === 'reupload' || c.verification_status === 'Re-upload') {
        normStatus = 'Re-upload';
      }

      return {
        ...c,
        id: c._id,
        _id: c._id,
        projectId: c._id,
        student_name: c.user_id?.full_name || 'Unknown',
        studentName: c.user_id?.full_name || 'Unknown',
        roll_number: c.user_id?.roll_number || 'N/A',
        studentRollNumber: c.user_id?.roll_number || 'N/A',
        department: c.user_id?.department || 'N/A',
        semester: c.user_id?.semester || 'N/A',
        student_id: c.user_id?._id || c.user_id,
        studentId: c.user_id?._id || c.user_id,
        title: c.title,
        description: c.description || '',
        technologies: Array.isArray(c.technologies) ? c.technologies : [],
        github_url: c.github_url || '',
        live_url: c.live_url || '',
        status: c.status || 'completed',
        start_date: c.start_date,
        startDate: c.start_date,
        end_date: c.end_date,
        endDate: c.end_date,
        uploadedDocumentUrl: c.file_url || null,
        uploadedDocumentType: detectedType,
        file_url: c.file_url || null,
        file_type: detectedType,
        documentUrl: `/api/projects/${c._id}/document`,
        file_name: c.file_name || (detectedType === 'pdf' ? 'project_document.pdf' : detectedType === 'image' ? 'project_proof.png' : null),
        verification_status: normStatus,
        verificationStatus: normStatus,
        staff_comment: c.staff_comment || '',
        rejectionReason: c.staff_comment || '',
        ai_status: c.ai_status || 'Original',
        ai_confidence_score: c.ai_confidence_score || 92,
        ai_explanation: c.ai_explanation || ''
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching projects for staff:', error);
    res.status(500).json({ error: 'Server error fetching projects' });
  }
});

router.get('/projects/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/projects/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

router.put('/projects/:id', auth, checkStaff, async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Project.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email semester');

    if (!item) {
      return res.status(404).json({ error: 'Project record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating project status:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
});

router.patch('/projects/:id', auth, checkStaff, async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Project.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email semester');

    if (!item) {
      return res.status(404).json({ error: 'Project record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating project status via patch:', error);
    res.status(500).json({ error: 'Server error updating project' });
  }
});

/**
 * 6A. HACKATHONS
 */
router.get('/hackathons', auth, checkStaff, async (req, res) => {
  try {
    const items = await Hackathon.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email semester').lean();
    const result = items.map(c => {
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        c.file_url?.includes('application/pdf') || 
        c.file_url?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        c.file_url?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        c.file_url?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'Pending';
      if (c.verification_status === 'approved' || c.verification_status === 'Verified') {
        normStatus = 'Verified';
      } else if (c.verification_status === 'rejected' || c.verification_status === 'Rejected') {
        normStatus = 'Rejected';
      } else if (c.verification_status === 'reupload' || c.verification_status === 'Re-upload') {
        normStatus = 'Re-upload';
      }

      return {
        ...c,
        id: c._id,
        _id: c._id,
        hackathonId: c._id,
        student_name: c.user_id?.full_name || 'Unknown',
        studentName: c.user_id?.full_name || 'Unknown',
        roll_number: c.user_id?.roll_number || 'N/A',
        studentRollNumber: c.user_id?.roll_number || 'N/A',
        department: c.user_id?.department || 'N/A',
        semester: c.user_id?.semester || 'N/A',
        student_id: c.user_id?._id || c.user_id,
        studentId: c.user_id?._id || c.user_id,
        name: c.name,
        organizer: c.organizer,
        date: c.date,
        team_name: c.team_name || '',
        result: c.result || 'participated',
        prize: c.prize || '',
        project_name: c.project_name || '',
        mode: c.mode || 'online',
        url: c.url || '',
        uploadedDocumentUrl: c.file_url || null,
        uploadedDocumentType: detectedType,
        file_url: c.file_url || null,
        file_type: detectedType,
        documentUrl: `/api/hackathons/${c._id}/document`,
        file_name: c.file_name || (detectedType === 'pdf' ? `${c.name}_certificate.pdf` : `${c.name}_proof.png`),
        verification_status: normStatus,
        verificationStatus: normStatus,
        staff_comment: c.staff_comment || '',
        rejectionReason: c.staff_comment || '',
        ai_status: c.ai_status || 'Original',
        ai_confidence_score: c.ai_confidence_score || 95,
        ai_explanation: c.ai_explanation || '',
        created_at: c.created_at,
        uploadedAt: c.created_at
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching hackathons for staff:', error);
    res.status(500).json({ error: 'Server error fetching hackathons' });
  }
});

router.get('/hackathons/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/hackathons/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

const updateHackathonStatusHandler = async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Hackathon.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email semester');

    if (!item) {
      return res.status(404).json({ error: 'Hackathon record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating hackathon status:', error);
    res.status(500).json({ error: 'Server error updating hackathon' });
  }
};

router.put('/hackathons/:id', auth, checkStaff, updateHackathonStatusHandler);
router.patch('/hackathons/:id', auth, checkStaff, updateHackathonStatusHandler);

/**
 * 6B. WORKSHOPS
 */
router.get('/workshops', auth, checkStaff, async (req, res) => {
  try {
    const items = await Workshop.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department email semester').lean();
    const result = items.map(c => {
      const rawDocUrl = c.file_url || c.certificate_url;
      const isPdf = Boolean(
        c.file_type === 'pdf' || 
        rawDocUrl?.includes('application/pdf') || 
        rawDocUrl?.endsWith('.pdf') || 
        c.file_name?.toLowerCase().endsWith('.pdf')
      );
      const isImage = Boolean(
        c.file_type === 'image' ||
        rawDocUrl?.startsWith('data:image/') ||
        c.file_name?.match(/\.(jpe?g|png|webp)$/i) ||
        rawDocUrl?.match(/\.(jpe?g|png|webp)/i)
      );
      const detectedType = isPdf ? 'pdf' : (isImage ? 'image' : null);

      let normStatus = 'Pending';
      if (c.verification_status === 'approved' || c.verification_status === 'Verified') {
        normStatus = 'Verified';
      } else if (c.verification_status === 'rejected' || c.verification_status === 'Rejected') {
        normStatus = 'Rejected';
      } else if (c.verification_status === 'reupload' || c.verification_status === 'Re-upload') {
        normStatus = 'Re-upload';
      }

      return {
        ...c,
        id: c._id,
        _id: c._id,
        workshopId: c._id,
        student_name: c.user_id?.full_name || 'Unknown',
        studentName: c.user_id?.full_name || 'Unknown',
        roll_number: c.user_id?.roll_number || 'N/A',
        studentRollNumber: c.user_id?.roll_number || 'N/A',
        department: c.user_id?.department || 'N/A',
        semester: c.user_id?.semester || 'N/A',
        student_id: c.user_id?._id || c.user_id,
        studentId: c.user_id?._id || c.user_id,
        name: c.name,
        organizer: c.organizer,
        date: c.date,
        duration_hours: c.duration_hours || null,
        skills_gained: Array.isArray(c.skills_gained) ? c.skills_gained : [],
        certificate_url: c.certificate_url || '',
        url: c.url || c.certificate_url || '',
        mode: c.mode || 'online',
        uploadedDocumentUrl: rawDocUrl || null,
        uploadedDocumentType: detectedType,
        file_url: rawDocUrl || null,
        file_type: detectedType,
        documentUrl: `/api/workshops/${c._id}/document`,
        file_name: c.file_name || (detectedType === 'pdf' ? `${c.name}_certificate.pdf` : `${c.name}_proof.png`),
        verification_status: normStatus,
        verificationStatus: normStatus,
        staff_comment: c.staff_comment || '',
        rejectionReason: c.staff_comment || '',
        ai_status: c.ai_status || 'Original',
        ai_confidence_score: c.ai_confidence_score || 94,
        ai_explanation: c.ai_explanation || '',
        created_at: c.created_at,
        uploadedAt: c.created_at
      };
    });
    res.json(result);
  } catch (error) {
    console.error('Error fetching workshops for staff:', error);
    res.status(500).json({ error: 'Server error fetching workshops' });
  }
});

router.get('/workshops/:id/document', (req, res) => {
  const queryStr = new URLSearchParams(req.query).toString();
  res.redirect(`/api/workshops/${req.params.id}/document${queryStr ? '?' + queryStr : ''}`);
});

const updateWorkshopStatusHandler = async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'Pending';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'Verified';
      else if (lower === 'rejected') normStatus = 'Rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'Re-upload';
      else normStatus = 'Pending';
    }

    if (normStatus === 'Rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Workshop.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment || '',
        updated_at: new Date()
      }, 
      { new: true }
    ).populate('user_id', 'full_name roll_number department email semester');

    if (!item) {
      return res.status(404).json({ error: 'Workshop record not found' });
    }

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: normStatus,
      staff_comment: rawComment || '',
      rejectionReason: rawComment || ''
    });
  } catch (error) {
    console.error('Error updating workshop status:', error);
    res.status(500).json({ error: 'Server error updating workshop' });
  }
};

router.put('/workshops/:id', auth, checkStaff, updateWorkshopStatusHandler);
router.patch('/workshops/:id', auth, checkStaff, updateWorkshopStatusHandler);

/**
 * 7. SKILLS
 */
router.get('/skills', auth, checkStaff, async (req, res) => {
  try {
    const items = await Skill.find().sort({ created_at: -1 }).populate('user_id', 'full_name roll_number department').lean();
    const result = items.map(c => ({
      ...c,
      id: c._id,
      student_name: c.user_id?.full_name || 'Unknown',
      roll_number: c.user_id?.roll_number || 'N/A',
      department: c.user_id?.department || 'N/A',
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching skills' });
  }
});

router.put('/skills/:id', auth, checkStaff, async (req, res) => {
  try {
    const rawStatus = req.body.verification_status || req.body.status || req.body.verificationStatus;
    const rawComment = req.body.staff_comment !== undefined 
      ? req.body.staff_comment 
      : (req.body.remarks !== undefined 
          ? req.body.remarks 
          : (req.body.remark !== undefined 
              ? req.body.remark 
              : (req.body.rejectionReason !== undefined 
                  ? req.body.rejectionReason 
                  : (req.body.rejection_reason !== undefined 
                      ? req.body.rejection_reason 
                      : (req.body.comment || '')))));

    let normStatus = 'approved';
    if (rawStatus) {
      const lower = rawStatus.toLowerCase();
      if (lower === 'verified' || lower === 'approved') normStatus = 'approved';
      else if (lower === 'rejected') normStatus = 'rejected';
      else if (lower === 'reupload' || lower === 're-upload') normStatus = 'reupload';
      else normStatus = 'pending';
    }

    if (normStatus === 'rejected' && (!rawComment || !rawComment.trim())) {
      return res.status(400).json({ error: 'Please enter a rejection reason in the remarks field before rejecting.' });
    }

    const item = await Skill.findByIdAndUpdate(
      req.params.id, 
      { 
        verification_status: normStatus, 
        staff_comment: rawComment ? rawComment.trim() : '',
        updated_at: new Date()
      }, 
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Skill record not found' });
    }

    const displayStatus = normStatus === 'approved' ? 'Verified' : (normStatus === 'rejected' ? 'Rejected' : (normStatus === 'reupload' ? 'Re-upload' : 'Pending'));

    res.json({
      ...item.toObject(),
      verification_status: normStatus,
      verificationStatus: displayStatus,
      status: displayStatus,
      staff_comment: rawComment ? rawComment.trim() : '',
      rejectionReason: rawComment ? rawComment.trim() : ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating skill' });
  }
});

/**
 * 8. PLACEMENT ANALYTICS
 */
router.get('/placement-analytics', auth, checkStaff, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').lean();
    const validStudentObjectIds = students.map(s => s._id);

    const [growthDocs, dnaAssessments, perfs, skills] = await Promise.all([
      GrowthMetrics.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      DNAAssessment.find({ student_id: { $in: validStudentObjectIds } }).lean(),
      SemesterPerformance.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Skill.find({ user_id: { $in: validStudentObjectIds } }).lean()
    ]);

    const growthMap = new Map(growthDocs.map(g => [g.user_id.toString(), g]));
    const dnaMap = new Map();
    dnaAssessments.forEach(d => {
      const sid = d.student_id.toString();
      if (!dnaMap.has(sid)) dnaMap.set(sid, []);
      dnaMap.get(sid).push(d);
    });

    let placementReady = 0;
    let atRiskStudents = 0;

    students.forEach(student => {
      const sid = student._id.toString();
      const gm = growthMap.get(sid);
      const studentSems = perfs.filter(p => p.user_id && p.user_id.toString() === sid);
      const studentSkills = skills.filter(s => s.user_id && s.user_id.toString() === sid);
      const studentDnas = dnaMap.get(sid) || [];
      const staffDna = studentDnas.find(d => d.assessment_type === 'staff');
      const selfDna = studentDnas.find(d => d.assessment_type === 'self');

      const validCgpas = studentSems.map(s => Number(s.cgpa || s.sgpa)).filter(v => !isNaN(v) && v > 0);
      const latestCgpa = validCgpas.length > 0 ? validCgpas[validCgpas.length - 1] : 0;
      const evaluatedGrowthScore = (gm && typeof gm.overall_score === 'number' && gm.overall_score > 0) ? gm.overall_score : null;

      const hasAssessmentData = validCgpas.length > 0 || studentSkills.length > 0 || evaluatedGrowthScore !== null || Boolean(staffDna || selfDna);

      const isPlacementReady = 
        (gm && gm.growth_stage === 'Placement Ready') ||
        (evaluatedGrowthScore !== null && evaluatedGrowthScore >= 70) ||
        (staffDna && typeof staffDna.overall_score === 'number' && staffDna.overall_score >= 70);

      if (isPlacementReady) placementReady++;

      if (hasAssessmentData) {
        const isRisk = 
          (gm && gm.growth_stage === 'Risk') ||
          (evaluatedGrowthScore !== null && evaluatedGrowthScore < 40) ||
          (latestCgpa > 0 && latestCgpa < 6.0) ||
          (staffDna && typeof staffDna.overall_score === 'number' && staffDna.overall_score < 40);

        if (isRisk) atRiskStudents++;
      }
    });

    let totalCgpa = 0, cgpaCount = 0;
    perfs.forEach(p => {
      const v = Number(p.cgpa || p.sgpa);
      if (!isNaN(v) && v > 0) { totalCgpa += v; cgpaCount++; }
    });
    const averageCgpa = cgpaCount > 0 ? parseFloat((totalCgpa / cgpaCount).toFixed(2)) : 0;

    let totalSkill = 0, validSkillCount = 0;
    skills.forEach(s => { 
      const prof = Number(s.proficiency);
      if (!isNaN(prof) && prof > 0) { totalSkill += prof; validSkillCount++; } 
    });
    const averageSkillScore = validSkillCount > 0 ? Math.round(totalSkill / validSkillCount) : 0;

    const usersByDept = await User.aggregate([
      { $match: { role: 'student' } },
      { $group: { _id: '$department', studentIds: { $push: '$_id' }, count: { $sum: 1 } } }
    ]);

    const departmentData = [];
    for (const dept of usersByDept) {
      if (!dept._id) continue;
      const deptStudentIds = dept.studentIds;
      
      const readyInDept = await GrowthMetrics.countDocuments({ 
        user_id: { $in: deptStudentIds }, 
        $or: [{ growth_stage: 'Placement Ready' }, { overall_score: { $gte: 70 } }] 
      });
      const placementReadyPercent = dept.count > 0 ? Math.round((readyInDept / dept.count) * 100) : 0;

      const deptPerfs = await SemesterPerformance.find({ user_id: { $in: deptStudentIds } }).lean();
      let dCgpa = 0, dCount = 0;
      deptPerfs.forEach(p => {
        const v = Number(p.cgpa || p.sgpa);
        if (!isNaN(v) && v > 0) { dCgpa += v; dCount++; }
      });
      const deptAvgCgpa = dCount > 0 ? parseFloat((dCgpa / dCount).toFixed(2)) : 0;

      departmentData.push({
        name: dept._id,
        cgpa: deptAvgCgpa,
        placementReady: placementReadyPercent,
        students: dept.count
      });
    }

    const skillNameAgg = await Skill.aggregate([
      { $match: { user_id: { $in: validStudentObjectIds } } },
      { $group: { _id: '$skill_name', score: { $avg: '$proficiency' } } },
      { $sort: { score: -1 } },
      { $limit: 6 }
    ]);
    
    const skillData = skillNameAgg.map(s => ({
      name: s._id,
      score: s.score != null ? Math.round(s.score) : 0
    }));

    res.json({
      placementReady,
      averageCgpa,
      averageSkillScore,
      atRiskStudents,
      departmentData,
      skillData,
      timelineData: []
    });
  } catch (error) {
    console.error('Error fetching placement analytics:', error);
    res.status(500).json({ error: 'Server error fetching placement analytics' });
  }
});

/**
 * 9. AI RISK ANALYSIS
 */
const getRiskAnalysis = async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').lean();
    const validStudentObjectIds = students.map(s => s._id);

    const [growthMetrics, semesterPerformances, skills, dnaAssessments] = await Promise.all([
      GrowthMetrics.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      SemesterPerformance.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      Skill.find({ user_id: { $in: validStudentObjectIds } }).lean(),
      DNAAssessment.find({ student_id: { $in: validStudentObjectIds } }).lean()
    ]);

    const growthMap = new Map(growthMetrics.map(g => [g.user_id?.toString(), g]));
    const perfMap = new Map();
    semesterPerformances.forEach(p => {
      if (p.user_id) {
        const uId = p.user_id.toString();
        if (!perfMap.has(uId)) perfMap.set(uId, []);
        perfMap.get(uId).push(p);
      }
    });

    const skillCountMap = new Map();
    skills.forEach(s => {
      if (s.user_id) {
        const uId = s.user_id.toString();
        skillCountMap.set(uId, (skillCountMap.get(uId) || 0) + 1);
      }
    });

    const dnaMap = new Map();
    dnaAssessments.forEach(d => {
      if (d.student_id) {
        const sid = d.student_id.toString();
        if (!dnaMap.has(sid)) dnaMap.set(sid, []);
        dnaMap.get(sid).push(d);
      }
    });

    const atRiskStudents = [];

    students.forEach(s => {
      const uId = s._id.toString();
      const gm = growthMap.get(uId);
      const perfs = perfMap.get(uId) || [];
      const validPerfs = perfs.filter(p => (p.cgpa != null && Number(p.cgpa) > 0) || (p.sgpa != null && Number(p.sgpa) > 0));
      const latestPerf = validPerfs.sort((a, b) => b.semester - a.semester)[0] || perfs.sort((a, b) => b.semester - a.semester)[0];
      const cgpa = latestPerf ? Number(latestPerf.cgpa || latestPerf.sgpa || 0) : 0;
      const skillCount = skillCountMap.get(uId) || 0;
      const studentDnas = dnaMap.get(uId) || [];
      const staffDna = studentDnas.find(d => d.assessment_type === 'staff');
      const selfDna = studentDnas.find(d => d.assessment_type === 'self');

      const evaluatedGrowthScore = (gm && typeof gm.overall_score === 'number' && gm.overall_score > 0) ? gm.overall_score : null;
      const hasAssessmentData = cgpa > 0 || skillCount > 0 || evaluatedGrowthScore !== null || Boolean(staffDna || selfDna);

      // If student has no assessment data, do not invent a fake risk status
      if (!hasAssessmentData) {
        return;
      }

      const riskFactors = [];
      if (cgpa > 0 && cgpa < 6.0) riskFactors.push(`Low CGPA (${cgpa.toFixed(2)})`);
      if (gm?.growth_stage === 'Risk') riskFactors.push(`Growth stage flagged as Risk`);
      if (evaluatedGrowthScore !== null && evaluatedGrowthScore < 40) riskFactors.push(`Low overall growth index (${evaluatedGrowthScore}%)`);
      if (staffDna && typeof staffDna.overall_score === 'number' && staffDna.overall_score < 40) {
        riskFactors.push(`Low staff DNA assessment score (${staffDna.overall_score})`);
      }

      if (riskFactors.length > 0 || gm?.growth_stage === 'Risk') {
        atRiskStudents.push({
          ...s,
          id: s._id,
          user_id: s._id,
          growth_metrics: gm,
          latest_performance: latestPerf,
          cgpa: cgpa > 0 ? cgpa.toFixed(2) : 'N/A',
          risk_factors: riskFactors.length > 0 ? riskFactors : ['Requires academic mentoring'],
          recommended_action: cgpa > 0 && cgpa < 6.0 ? 'Schedule academic counseling session' : 'Encourage adding technical certifications & projects'
        });
      }
    });

    res.json({
      totalStudents: students.length,
      riskStudentsCount: atRiskStudents.length,
      students: atRiskStudents
    });
  } catch (error) {
    console.error('Error fetching risk analysis:', error);
    res.status(500).json({ error: 'Server error fetching risk analysis' });
  }
};

router.get('/risk-analysis', auth, checkStaff, getRiskAnalysis);
router.get('/ai-risk-analysis', auth, checkStaff, getRiskAnalysis);

/**
 * 10. LEADERBOARD
 */
router.get('/leaderboard', auth, checkStaff, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').lean();
    const [growthMetrics, semesterPerformances] = await Promise.all([
      GrowthMetrics.find().lean(),
      SemesterPerformance.find().lean()
    ]);

    const growthMap = new Map(growthMetrics.map(g => [g.user_id?.toString(), g]));
    const perfMap = new Map();
    semesterPerformances.forEach(p => {
      if (p.user_id) {
        const uId = p.user_id.toString();
        if (!perfMap.has(uId)) perfMap.set(uId, []);
        perfMap.get(uId).push(p);
      }
    });

    const ranked = students.map(student => {
      const uId = student._id.toString();
      const gm = growthMap.get(uId);
      const perfs = perfMap.get(uId) || [];
      const latestPerf = perfs.sort((a, b) => b.semester - a.semester)[0];
      return {
        ...student,
        id: student._id,
        user_id: student._id,
        growth_metrics: gm,
        latest_performance: latestPerf,
      };
    }).sort((a, b) => (b.growth_metrics?.overall_score || 0) - (a.growth_metrics?.overall_score || 0))
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json(ranked);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

/**
 * 11. REPORTS
 */
router.get('/reports', auth, checkStaff, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const perfs = await SemesterPerformance.find().lean();
    const certs = await Certification.find().lean();
    const interns = await Internship.find().lean();
    const projs = await Project.find().lean();
    const skills = await Skill.find().lean();
    const growth = await GrowthMetrics.find().lean();

    res.json({
      totalStudents,
      semesterResultsCount: perfs.length,
      certificatesCount: certs.length,
      internshipsCount: interns.length,
      projectsCount: projs.length,
      skillsCount: skills.length,
      growthRecordsCount: growth.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching reports summary' });
  }
});

/**
 * Helper to format relative time
 */
function formatRelativeTime(date) {
  if (!date) return 'just now';
  const diffMs = Date.now() - new Date(date).getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return 'just now';
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
}

/**
 * 12. NOTIFICATIONS
 * GET /api/staff/notifications
 */
router.get('/notifications', auth, checkStaff, async (req, res) => {
  try {
    const staffId = req.user.id;

    // Fetch user notification states (read / dismissed)
    const userStates = await StaffNotification.find({ staff_id: staffId }).lean();
    const stateMap = new Map();
    userStates.forEach(s => {
      stateMap.set(s.notification_key, s);
    });

    const notifications = [];

    // 1. Check at risk students
    const regStudents = await User.find({ role: 'student' }).select('_id').lean();
    const regStudentIds = regStudents.map(s => s._id);

    const riskMetrics = await GrowthMetrics.find({ 
      user_id: { $in: regStudentIds },
      $or: [{ growth_stage: 'Risk' }, { overall_score: { $gt: 0, $lt: 40 } }] 
    }).populate('user_id', 'full_name roll_number department').lean();

    riskMetrics.forEach(r => {
      if (r.user_id) {
        const notifKey = `risk-${r._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          notifications.push({
            id: notifKey,
            type: 'alert',
            title: 'Students At Risk Detected',
            desc: `${r.user_id.full_name || 'Student'} (${r.user_id.roll_number || 'N/A'}) is currently flagged as requiring academic or placement support.`,
            time: formatRelativeTime(r.updated_at || r.created_at),
            rawTime: r.updated_at || r.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/ai-risk-analysis',
            studentName: r.user_id.full_name || 'Student',
            studentId: r.user_id.roll_number || ''
          });
        }
      }
    });

    // 2. Real Semester Results
    const semesterResults = await SemesterPerformance.find()
      .sort({ created_at: -1 })
      .limit(20)
      .populate('user_id', 'full_name roll_number department')
      .lean();

    semesterResults.forEach(s => {
      if (s.user_id) {
        const notifKey = `sem-${s._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          const isPending = s.verification_status === 'pending';
          notifications.push({
            id: notifKey,
            type: 'academic',
            title: isPending ? 'New Semester Result Uploaded' : `Semester ${s.semester} Result ${s.verification_status.toUpperCase()}`,
            desc: `${s.user_id.full_name || 'Student'} ${isPending ? 'uploaded' : 'has a'} Semester ${s.semester} marksheet (${s.sgpa ? `SGPA: ${s.sgpa}` : ''} ${s.credits_earned ? `Credits: ${s.credits_earned}` : ''}).`,
            time: formatRelativeTime(s.created_at),
            rawTime: s.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/students',
            studentName: s.user_id.full_name || 'Student',
            studentId: s.user_id.roll_number || ''
          });
        }
      }
    });

    // 3. Real Certificates
    const certs = await Certification.find()
      .sort({ created_at: -1 })
      .limit(20)
      .populate('user_id', 'full_name roll_number department')
      .lean();

    certs.forEach(c => {
      if (c.user_id) {
        const notifKey = `cert-${c._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          const isPending = c.verification_status === 'pending';
          notifications.push({
            id: notifKey,
            type: 'certificate',
            title: isPending ? 'New Certificate Submitted' : `Certificate ${c.verification_status.toUpperCase()}`,
            desc: `${c.user_id.full_name || 'Student'} submitted certificate: "${c.name}" issued by ${c.issuer || 'Organization'}.`,
            time: formatRelativeTime(c.created_at),
            rawTime: c.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/certificates',
            studentName: c.user_id.full_name || 'Student',
            studentId: c.user_id.roll_number || ''
          });
        }
      }
    });

    // 4. Real Internships
    const interns = await Internship.find()
      .sort({ created_at: -1 })
      .limit(20)
      .populate('user_id', 'full_name roll_number department')
      .lean();

    interns.forEach(i => {
      if (i.user_id) {
        const notifKey = `intern-${i._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          const isPending = i.verification_status === 'pending' || i.verification_status === 'Pending';
          notifications.push({
            id: notifKey,
            type: 'internship',
            title: isPending ? 'New Internship Submitted' : `Internship ${i.verification_status.toUpperCase()}`,
            desc: `${i.user_id.full_name || 'Student'} submitted ${i.role || 'Internship'} at ${i.company || 'Company'}.`,
            time: formatRelativeTime(i.created_at),
            rawTime: i.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/internships',
            studentName: i.user_id.full_name || 'Student',
            studentId: i.user_id.roll_number || ''
          });
        }
      }
    });

    // 5. Real Projects
    const projects = await Project.find()
      .sort({ created_at: -1 })
      .limit(20)
      .populate('user_id', 'full_name roll_number department')
      .lean();

    projects.forEach(p => {
      if (p.user_id) {
        const notifKey = `proj-${p._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          const isPending = p.verification_status === 'pending';
          notifications.push({
            id: notifKey,
            type: 'project',
            title: isPending ? 'New Project Submitted' : `Project ${p.verification_status.toUpperCase()}`,
            desc: `${p.user_id.full_name || 'Student'} submitted project: "${p.title}".`,
            time: formatRelativeTime(p.created_at),
            rawTime: p.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/projects',
            studentName: p.user_id.full_name || 'Student',
            studentId: p.user_id.roll_number || ''
          });
        }
      }
    });

    // 6. Real Skills Updates
    const skills = await Skill.find()
      .sort({ created_at: -1 })
      .limit(10)
      .populate('user_id', 'full_name roll_number department')
      .lean();

    skills.forEach(sk => {
      if (sk.user_id) {
        const notifKey = `skill-${sk._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          notifications.push({
            id: notifKey,
            type: 'skill',
            title: 'Student Skill Added',
            desc: `${sk.user_id.full_name || 'Student'} added skill: ${sk.skill_name} (${sk.proficiency}% proficiency).`,
            time: formatRelativeTime(sk.created_at),
            rawTime: sk.created_at || new Date(),
            read: state?.is_read || false,
            link: '/staff/skills',
            studentName: sk.user_id.full_name || 'Student',
            studentId: sk.user_id.roll_number || ''
          });
        }
      }
    });

    // 7. Real Student Messages sent to this staff member
    const studentMessages = await Message.find({
      $or: [
        { receiverId: staffId, receiverRole: 'staff' },
        { staffId: staffId, senderRole: 'student' }
      ]
    })
      .sort({ created_at: -1 })
      .limit(30)
      .populate('studentId', 'full_name roll_number department avatar_url')
      .populate('senderId', 'full_name roll_number department avatar_url')
      .lean();

    studentMessages.forEach(m => {
      const studentObj = (m.senderRole === 'student' ? m.senderId : m.studentId) || m.studentId || m.senderId;
      if (studentObj) {
        const notifKey = `msg-${m._id}`;
        const state = stateMap.get(notifKey);
        if (!state?.is_dismissed) {
          const studentName = studentObj.full_name || 'Student';
          notifications.push({
            id: notifKey,
            type: 'message',
            title: `New message from ${studentName}`,
            desc: `${studentName} sent you a message: "${m.message}"`,
            time: formatRelativeTime(m.created_at),
            rawTime: m.created_at || new Date(),
            read: m.read || state?.is_read || false,
            link: `/staff/ai-risk-analysis?studentId=${studentObj._id}`,
            studentName: studentName,
            studentId: studentObj._id?.toString() || studentObj.roll_number || ''
          });
        }
      }
    });

    // Sort by latest timestamp
    notifications.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Server error fetching notifications' });
  }
});

/**
 * PUT /api/staff/notifications/read-all
 * Mark all notifications as read for this staff member
 */
router.put('/notifications/read-all', auth, checkStaff, async (req, res) => {
  try {
    const staffId = req.user.id;
    const { notificationIds = [] } = req.body;

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      const bulkOps = notificationIds.map(key => ({
        updateOne: {
          filter: { staff_id: staffId, notification_key: key },
          update: { $set: { is_read: true, read_at: new Date() } },
          upsert: true
        }
      }));
      await StaffNotification.bulkWrite(bulkOps);
    }

    await Message.updateMany(
      { receiverId: staffId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all read:', error);
    res.status(500).json({ error: 'Server error marking notifications read' });
  }
});

/**
 * PUT /api/staff/notifications/:id/read
 * Mark single notification as read
 */
router.put('/notifications/:id/read', auth, checkStaff, async (req, res) => {
  try {
    const staffId = req.user.id;
    const notificationKey = req.params.id;

    await StaffNotification.findOneAndUpdate(
      { staff_id: staffId, notification_key: notificationKey },
      { $set: { is_read: true, read_at: new Date() } },
      { upsert: true, new: true }
    );

    if (notificationKey.startsWith('msg-')) {
      const msgId = notificationKey.replace('msg-', '');
      if (msgId.match(/^[0-9a-fA-F]{24}$/)) {
        await Message.findByIdAndUpdate(msgId, { $set: { read: true } });
      }
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Server error marking notification read' });
  }
});

/**
 * DELETE /api/staff/notifications/:id
 * Dismiss single notification for staff member
 */
router.delete('/notifications/:id', auth, checkStaff, async (req, res) => {
  try {
    const staffId = req.user.id;
    const notificationKey = req.params.id;

    await StaffNotification.findOneAndUpdate(
      { staff_id: staffId, notification_key: notificationKey },
      { $set: { is_dismissed: true } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ error: 'Server error dismissing notification' });
  }
});

/**
 * 13. MESSAGING - Get conversation with a student
 * GET /api/staff/messages/:studentId
 */
router.get('/messages/:studentId', auth, checkStaff, async (req, res) => {
  try {
    const studentParam = req.params.studentId;
    let student = null;
    
    if (studentParam && studentParam.match(/^[0-9a-fA-F]{24}$/)) {
      student = await User.findById(studentParam).select('-password').lean();
    }
    if (!student) {
      student = await User.findOne({ roll_number: studentParam, role: 'student' }).select('-password').lean();
    }
    
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const staffId = req.user.id;
    const studentId = student._id;

    let conv = await Conversation.findOne({ staffId, studentId });
    if (!conv) {
      conv = new Conversation({
        staffId,
        studentId,
        lastMessage: '',
        lastMessageAt: new Date()
      });
      await conv.save();
    } else {
      conv.unreadByStaff = 0;
      await conv.save();
    }

    const messages = await Message.find({
      $or: [
        { conversationId: conv._id },
        { studentId: student._id, staffId: staffId },
        { senderId: staffId, receiverId: student._id },
        { senderId: student._id, receiverId: staffId }
      ]
    }).sort({ created_at: 1 }).lean();

    // Mark unread messages sent by student to staff as read
    await Message.updateMany(
      { receiverId: req.user.id, senderId: student._id, read: false },
      { $set: { read: true } }
    );

    const formatted = messages.map(m => ({
      id: m._id,
      _id: m._id,
      conversationId: conv._id,
      senderId: m.senderId,
      senderRole: m.senderRole,
      receiverId: m.receiverId,
      receiverRole: m.receiverRole,
      studentId: m.studentId,
      staffId: m.staffId,
      message: m.message,
      read: m.read,
      created_at: m.created_at,
      isStaff: m.senderRole === 'staff' || m.senderId.toString() === req.user.id.toString(),
      isSelf: m.senderId.toString() === req.user.id.toString()
    }));

    res.json({
      conversationId: conv._id,
      student: {
        id: student._id,
        _id: student._id,
        full_name: student.full_name,
        roll_number: student.roll_number,
        department: student.department,
        semester: student.semester,
        avatar_url: student.avatar_url
      },
      messages: formatted
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error fetching messages' });
  }
});

/**
 * 14. MESSAGING - Send message to a student
 * POST /api/staff/messages/:studentId
 */
router.post('/messages/:studentId', auth, checkStaff, async (req, res) => {
  try {
    const studentParam = req.params.studentId;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    let student = null;
    if (studentParam && studentParam.match(/^[0-9a-fA-F]{24}$/)) {
      student = await User.findById(studentParam);
    }
    if (!student) {
      student = await User.findOne({ roll_number: studentParam, role: 'student' });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const staffId = req.user.id;
    const studentId = student._id;

    let conv = await Conversation.findOne({ staffId, studentId });
    if (!conv) {
      conv = new Conversation({
        staffId,
        studentId,
        lastMessage: message.trim(),
        lastMessageAt: new Date(),
        unreadByStudent: 1,
        unreadByStaff: 0
      });
    } else {
      conv.lastMessage = message.trim();
      conv.lastMessageAt = new Date();
      conv.unreadByStudent = (conv.unreadByStudent || 0) + 1;
    }
    await conv.save();

    const newMsg = new Message({
      conversationId: conv._id,
      senderId: req.user.id,
      senderRole: 'staff',
      receiverId: student._id,
      receiverRole: 'student',
      studentId: student._id,
      staffId: req.user.id,
      message: message.trim(),
      read: false,
      created_at: new Date()
    });

    await newMsg.save();

    res.status(201).json({
      success: true,
      message: {
        id: newMsg._id,
        _id: newMsg._id,
        conversationId: conv._id,
        senderId: newMsg.senderId,
        senderRole: newMsg.senderRole,
        receiverId: newMsg.receiverId,
        receiverRole: newMsg.receiverRole,
        studentId: newMsg.studentId,
        staffId: newMsg.staffId,
        message: newMsg.message,
        read: newMsg.read,
        created_at: newMsg.created_at,
        isStaff: true,
        isSelf: true
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
});

/**
 * 15. STUDENT DNA - STAFF DIRECTORY
 * GET /api/staff/student-dna
 */
router.get('/student-dna', auth, checkStaff, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password')
      .sort({ full_name: 1 })
      .lean();

    const assessments = await DNAAssessment.find().lean();
    const assessMap = new Map();
    assessments.forEach(a => {
      const sId = a.student_id.toString();
      if (!assessMap.has(sId)) assessMap.set(sId, {});
      assessMap.get(sId)[a.assessment_type] = a;
    });

    const result = students.map(s => {
      const sId = s._id.toString();
      const studentAssessments = assessMap.get(sId) || {};
      const self = studentAssessments.self || null;
      const staff = studentAssessments.staff || null;

      return {
        id: s._id,
        _id: s._id,
        name: s.full_name || s.name || 'Student',
        full_name: s.full_name || s.name || 'Student',
        roll_number: s.roll_number || 'N/A',
        department: s.department || 'N/A',
        semester: s.semester || 'N/A',
        email: s.email,
        avatar_url: s.avatar_url || null,
        hasSelfAssessment: Boolean(self),
        hasStaffAssessment: Boolean(staff),
        selfScore: self?.overall_score ?? null,
        staffScore: staff?.overall_score ?? null,
        lastAssessedAt: staff?.assessed_at || staff?.updated_at || self?.assessed_at || null,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching student DNA directory for staff:', error);
    res.status(500).json({ error: 'Server error fetching student DNA directory' });
  }
});

/**
 * 16. STUDENT DNA - GET SPECIFIC STUDENT DNA
 * GET /api/staff/student-dna/:studentId
 */
router.get('/student-dna/:studentId', auth, checkStaff, async (req, res) => {
  try {
    const studentParam = req.params.studentId;
    let student = null;

    if (studentParam && studentParam.match(/^[0-9a-fA-F]{24}$/)) {
      student = await User.findById(studentParam).select('-password');
    }
    if (!student) {
      student = await User.findOne({ roll_number: studentParam, role: 'student' }).select('-password');
    }

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

    const dna = calculateStudentDNA({
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

    // Provide complete raw evidence items for staff inspection
    res.json({
      ...dna,
      rawEvidence: {
        semesterPerformances,
        skills,
        projects,
        certifications,
        internships,
        hackathons,
        workshops
      }
    });
  } catch (error) {
    console.error('Error fetching student DNA for staff:', error);
    res.status(500).json({ error: 'Server error fetching student DNA' });
  }
});

/**
 * 17. STUDENT DNA - SUBMIT/UPDATE STAFF ASSESSMENT
 * POST /api/staff/student-dna/:studentId/assessment
 */
router.post('/student-dna/:studentId/assessment', auth, checkStaff, async (req, res) => {
  try {
    const studentParam = req.params.studentId;
    let student = null;

    if (studentParam && studentParam.match(/^[0-9a-fA-F]{24}$/)) {
      student = await User.findById(studentParam);
    }
    if (!student) {
      student = await User.findOne({ roll_number: studentParam, role: 'student' });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student record not found' });
    }

    const staffUser = await User.findById(req.user.id);
    const { dimensions, general_remarks } = req.body;

    if (!dimensions || typeof dimensions !== 'object') {
      return res.status(400).json({ error: 'Dimensions assessment object is required.' });
    }

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
        remarks: typeof dim.remarks === 'string' ? dim.remarks.trim() : (typeof dim.explanation === 'string' ? dim.explanation.trim() : '')
      };
      totalScore += validatedDimensions[key].score;
    }

    const overallScore = Math.round(totalScore / DIMENSION_KEYS.length);

    let assessment = await DNAAssessment.findOne({ 
      student_id: student._id, 
      assessment_type: 'staff' 
    });

    if (assessment) {
      assessment.assessor_id = staffUser._id;
      assessment.assessor_name = staffUser.full_name || staffUser.name || 'Faculty';
      assessment.assessor_role = 'staff';
      assessment.dimensions = validatedDimensions;
      assessment.overall_score = overallScore;
      assessment.general_remarks = typeof general_remarks === 'string' ? general_remarks.trim() : '';
      assessment.assessed_at = new Date();
      await assessment.save();
    } else {
      assessment = new DNAAssessment({
        student_id: student._id,
        assessment_type: 'staff',
        assessor_id: staffUser._id,
        assessor_name: staffUser.full_name || staffUser.name || 'Faculty',
        assessor_role: 'staff',
        dimensions: validatedDimensions,
        overall_score: overallScore,
        general_remarks: typeof general_remarks === 'string' ? general_remarks.trim() : '',
        assessed_at: new Date()
      });
      await assessment.save();
    }

    // Recompute complete DNA with updated staff assessment
    const [
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      selfAssessment
    ] = await Promise.all([
      SemesterPerformance.find({ user_id: student._id }).sort({ semester: 1 }).lean(),
      Skill.find({ user_id: student._id }).lean(),
      Project.find({ user_id: student._id }).lean(),
      Certification.find({ user_id: student._id }).lean(),
      Internship.find({ user_id: student._id }).lean(),
      Hackathon.find({ user_id: student._id }).lean(),
      Workshop.find({ user_id: student._id }).lean(),
      DNAAssessment.findOne({ student_id: student._id, assessment_type: 'self' }).sort({ updated_at: -1 }).lean(),
    ]);

    const dna = calculateStudentDNA({
      student,
      semesterPerformances,
      skills,
      projects,
      certifications,
      internships,
      hackathons,
      workshops,
      selfAssessment,
      staffAssessment: assessment.toObject()
    });

    res.json({
      success: true,
      message: 'Staff assessment saved successfully!',
      dna: {
        ...dna,
        rawEvidence: {
          semesterPerformances,
          skills,
          projects,
          certifications,
          internships,
          hackathons,
          workshops
        }
      }
    });
  } catch (error) {
    console.error('Error saving staff DNA assessment:', error);
    res.status(500).json({ error: 'Server error saving staff assessment.' });
  }
});

module.exports = router;

