const express = require('express');
const router = express.Router();
const mongoose = require('../db/sqlite');
const MeetingRequest = require('../models/MeetingRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * POST /api/meetings
 * Staff requests a meeting with a student
 */
router.post('/', auth, async (req, res) => {
  try {
    const staffId = req.user.id;
    const { studentId, title, purpose, date, time, message } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }
    if (!purpose || !purpose.trim()) {
      return res.status(400).json({ error: 'Meeting purpose is required' });
    }
    if (!date || !time) {
      return res.status(400).json({ error: 'Meeting date and time are required' });
    }

    // Verify staff user
    const staffUser = await User.findById(staffId);
    if (!staffUser || staffUser.role !== 'staff') {
      return res.status(403).json({ error: 'Only staff members can create meeting requests' });
    }

    // Robust student lookup (ID, Roll Number, Email, or Name)
    let targetStudentId = String(studentId).trim();
    let student = null;
    if (mongoose.Types.ObjectId.isValid(targetStudentId)) {
      student = await User.findById(targetStudentId);
    }
    if (!student) {
      student = await User.findOne({ roll_number: targetStudentId });
    }
    if (!student) {
      student = await User.findOne({ email: targetStudentId });
    }
    if (!student) {
      student = await User.findOne({ full_name: new RegExp(`^${targetStudentId}$`, 'i') });
    }

    if (!student) {
      return res.status(404).json({ error: 'Student not found in database' });
    }

    // Check for duplicate pending meeting at exact same date & time; if exists, update it
    let meeting = await MeetingRequest.findOne({
      staffId: staffUser._id,
      studentId: student._id,
      date: date.trim(),
      time: time.trim(),
      status: 'pending'
    });

    if (meeting) {
      meeting.purpose = purpose.trim();
      meeting.title = title?.trim() || meeting.title;
      meeting.message = message?.trim() || meeting.message;
      meeting.updated_at = new Date();
      await meeting.save();
    } else {
      meeting = new MeetingRequest({
        staffId: staffUser._id,
        studentId: student._id,
        title: title?.trim() || 'Academic Counseling & Performance Review',
        purpose: purpose.trim(),
        date: date.trim(),
        time: time.trim(),
        message: message?.trim() || '',
        status: 'pending'
      });
      await meeting.save();
    }

    const populated = await MeetingRequest.findById(meeting._id)
      .populate('studentId', 'full_name roll_number department semester avatar_url')
      .populate('staffId', 'full_name email department avatar_url staff_id')
      .lean();

    res.status(201).json({
      success: true,
      message: `Meeting request sent to ${student.full_name || 'student'}`,
      meeting: {
        id: populated._id,
        _id: populated._id,
        ...populated,
        studentName: populated.studentId?.full_name || student.full_name,
        staffName: populated.staffId?.full_name || staffUser.full_name
      }
    });
  } catch (error) {
    console.error('Error creating meeting request:', error);
    res.status(500).json({ error: 'Server error creating meeting request' });
  }
});

/**
 * GET /api/meetings/student
 * Get all meeting requests for the logged-in student
 */
router.get('/student', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const studentUser = await User.findById(studentId).lean();

    const queryConditions = [{ studentId: studentId }];
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      queryConditions.push({ studentId: new mongoose.Types.ObjectId(studentId) });
    }
    if (studentUser?.roll_number) {
      const matchingUsers = await User.find({ roll_number: studentUser.roll_number }).select('_id').lean();
      matchingUsers.forEach(u => queryConditions.push({ studentId: u._id }));
    }

    const meetings = await MeetingRequest.find({ $or: queryConditions })
      .populate('staffId', 'full_name email department avatar_url staff_id')
      .sort({ created_at: -1 })
      .lean();

    const formatted = meetings.map(m => ({
      id: m._id,
      _id: m._id,
      staff: m.staffId,
      staffName: m.staffId?.full_name || 'Faculty Mentor',
      staffEmail: m.staffId?.email || '',
      staffDepartment: m.staffId?.department || 'Academic Faculty',
      title: m.title,
      purpose: m.purpose,
      date: m.date,
      time: m.time,
      message: m.message,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching student meeting requests:', error);
    res.status(500).json({ error: 'Server error fetching meeting requests' });
  }
});

/**
 * GET /api/meetings/staff
 * Get all meeting requests created by the logged-in staff
 */
router.get('/staff', auth, async (req, res) => {
  try {
    const staffId = req.user.id;
    const { studentId } = req.query;

    const filter = { staffId };
    if (studentId) {
      if (mongoose.Types.ObjectId.isValid(studentId)) {
        filter.studentId = new mongoose.Types.ObjectId(studentId);
      } else {
        const student = await User.findOne({ roll_number: studentId });
        if (student) filter.studentId = student._id;
      }
    }

    const meetings = await MeetingRequest.find(filter)
      .populate('studentId', 'full_name roll_number department semester avatar_url')
      .sort({ created_at: -1 })
      .lean();

    const formatted = meetings.map(m => ({
      id: m._id,
      _id: m._id,
      student: m.studentId,
      studentName: m.studentId?.full_name || 'Student',
      studentRollNumber: m.studentId?.roll_number || '',
      studentDepartment: m.studentId?.department || '',
      studentSemester: m.studentId?.semester || 1,
      title: m.title,
      purpose: m.purpose,
      date: m.date,
      time: m.time,
      message: m.message,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching staff meeting requests:', error);
    res.status(500).json({ error: 'Server error fetching meeting requests' });
  }
});

/**
 * GET /api/meetings/staff/:studentId
 * Get meetings with a specific student
 */
router.get('/staff/:studentId', auth, async (req, res) => {
  try {
    const staffId = req.user.id;
    const { studentId } = req.params;

    let targetStudentId = studentId;
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      targetStudentId = new mongoose.Types.ObjectId(studentId);
    } else {
      const student = await User.findOne({ roll_number: studentId });
      if (student) targetStudentId = student._id;
    }

    const meetings = await MeetingRequest.find({
      staffId,
      studentId: targetStudentId
    })
      .populate('studentId', 'full_name roll_number department semester avatar_url')
      .sort({ created_at: -1 })
      .lean();

    res.json(meetings.map(m => ({
      id: m._id,
      _id: m._id,
      student: m.studentId,
      studentName: m.studentId?.full_name || 'Student',
      title: m.title,
      purpose: m.purpose,
      date: m.date,
      time: m.time,
      message: m.message,
      status: m.status,
      created_at: m.created_at,
      updated_at: m.updated_at
    })));
  } catch (error) {
    console.error('Error fetching student meeting requests:', error);
    res.status(500).json({ error: 'Server error fetching meeting requests' });
  }
});

/**
 * PATCH /api/meetings/:id/status
 * Update status of meeting request (accept, decline, cancel, complete)
 */
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    const allowed = ['pending', 'accepted', 'declined', 'cancelled', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const meeting = await MeetingRequest.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting request not found' });
    }

    // Permission check
    const isStudent = meeting.studentId.toString() === userId.toString();
    const isStaff = meeting.staffId.toString() === userId.toString();

    if (!isStudent && !isStaff && req.user.role !== 'staff') {
      return res.status(403).json({ error: 'Unauthorized to modify this meeting request' });
    }

    // Student can accept or decline
    if (isStudent && !['accepted', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Students can only accept or decline meeting requests' });
    }

    meeting.status = status;
    meeting.updated_at = new Date();
    await meeting.save();

    const updated = await MeetingRequest.findById(meeting._id)
      .populate('studentId', 'full_name roll_number department semester avatar_url')
      .populate('staffId', 'full_name email department avatar_url staff_id')
      .lean();

    res.json({
      success: true,
      message: `Meeting request ${status}`,
      meeting: {
        id: updated._id,
        _id: updated._id,
        ...updated
      }
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({ error: 'Server error updating meeting status' });
  }
});

module.exports = router;
