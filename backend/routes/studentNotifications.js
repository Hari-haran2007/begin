const express = require('express');
const router = express.Router();
const mongoose = require('../db/sqlite');
const auth = require('../middleware/auth');
const StudentNotification = require('../models/StudentNotification');
const Message = require('../models/Message');
const MeetingRequest = require('../models/MeetingRequest');
const User = require('../models/User');
const Internship = require('../models/Internship');
const Certification = require('../models/Certification');

function formatRelativeTime(date) {
  if (!date) return 'Recently';
  const now = new Date();
  const past = new Date(date);
  const diffInSec = Math.floor((now - past) / 1000);

  if (diffInSec < 60) return 'Just now';
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * GET /api/student/notifications
 * Fetch all notifications for logged-in student
 */
router.get('/', auth, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Fetch student notification states
    const userStates = await StudentNotification.find({ student_id: studentId }).lean();
    const stateMap = new Map();
    userStates.forEach(s => {
      stateMap.set(s.notification_key, s);
    });

    const notifications = [];

    // 1. Messages sent from Staff to this Student
    const messages = await Message.find({
      $or: [
        { receiverId: studentId, receiverRole: 'staff' ? 'student' : 'student' },
        { studentId: studentId, senderRole: 'staff' }
      ]
    })
      .sort({ created_at: -1 })
      .limit(30)
      .populate('staffId', 'full_name email department avatar_url')
      .populate('senderId', 'full_name email department avatar_url')
      .lean();

    messages.forEach(msg => {
      const key = `msg-${msg._id}`;
      const state = stateMap.get(key);
      if (!state?.is_dismissed) {
        const staffObj = (msg.senderRole === 'staff' ? msg.senderId : msg.staffId) || msg.staffId || msg.senderId;
        const staffName = staffObj?.full_name || 'Faculty Mentor';
        const partnerId = staffObj?._id || msg.staffId || msg.senderId;

        notifications.push({
          id: key,
          type: 'message',
          title: `New message from ${staffName}`,
          desc: msg.message || 'You received a new message from your faculty mentor.',
          time: formatRelativeTime(msg.created_at),
          rawTime: msg.created_at || new Date(),
          read: msg.read || state?.is_read || false,
          link: `/messages?partnerId=${partnerId}`,
          partnerId: partnerId ? partnerId.toString() : '',
          senderName: staffName
        });
      }
    });

    // 2. Meeting Requests from Staff to this Student
    const studentUser = await User.findById(studentId).lean();
    const meetingQuery = [{ studentId: studentId }];
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      meetingQuery.push({ studentId: new mongoose.Types.ObjectId(studentId) });
    }
    if (studentUser?.roll_number) {
      const matchingUsers = await User.find({ roll_number: studentUser.roll_number }).select('_id').lean();
      matchingUsers.forEach(u => meetingQuery.push({ studentId: u._id }));
    }

    const meetings = await MeetingRequest.find({ $or: meetingQuery })
      .sort({ created_at: -1 })
      .limit(20)
      .populate('staffId', 'full_name email department avatar_url staff_id')
      .lean();

    meetings.forEach(m => {
      const key = `meet-${m._id}`;
      const state = stateMap.get(key);
      if (!state?.is_dismissed) {
        const staffName = m.staffId?.full_name || 'Faculty Mentor';
        const isRead = state?.is_read || m.status !== 'pending';

        notifications.push({
          id: key,
          type: 'meeting',
          title: `Meeting Request: ${m.title || 'Faculty Mentorship'}`,
          desc: `${staffName} scheduled a session on ${m.date} at ${m.time} (${m.status.toUpperCase()}).`,
          time: formatRelativeTime(m.created_at),
          rawTime: m.created_at || new Date(),
          read: isRead,
          link: '/messages?tab=meetings',
          meetingId: m._id,
          senderName: staffName
        });
      }
    });

    // 3. Internship Status Updates for this student
    const studentInternships = await Internship.find({ user_id: studentId })
      .sort({ updated_at: -1 })
      .limit(10)
      .lean();

    studentInternships.forEach(intern => {
      const isPending = intern.verification_status === 'pending' || intern.verification_status === 'Pending';
      if (!isPending) {
        const key = `intern-${intern._id}-${intern.verification_status}`;
        const state = stateMap.get(key);
        if (!state?.is_dismissed) {
          const isApproved = intern.verification_status === 'approved' || intern.verification_status === 'Verified';
          const isRejected = intern.verification_status === 'rejected' || intern.verification_status === 'Rejected';
          notifications.push({
            id: key,
            type: 'internship',
            title: isApproved ? `Internship Verified: ${intern.company}` : `Internship ${isRejected ? 'Rejected' : 'Update'}: ${intern.company}`,
            desc: isApproved 
              ? `Your internship as ${intern.role} at ${intern.company} has been verified.`
              : `Status: ${intern.verification_status}.${intern.staff_comment ? ` Reason: "${intern.staff_comment}"` : ''}`,
            time: formatRelativeTime(intern.updated_at || intern.created_at),
            rawTime: intern.updated_at || intern.created_at || new Date(),
            read: state?.is_read || false,
            link: '/internships',
            senderName: 'Staff Admin'
          });
        }
      }
    });

    // 4. Certificate Status Updates for this student
    const studentCertificates = await Certification.find({ user_id: studentId })
      .sort({ updated_at: -1 })
      .limit(10)
      .lean();

    studentCertificates.forEach(cert => {
      const isPending = !cert.verification_status || cert.verification_status === 'pending' || cert.verification_status === 'Pending';
      if (!isPending) {
        const key = `cert-${cert._id}-${cert.verification_status}`;
        const state = stateMap.get(key);
        if (!state?.is_dismissed) {
          const isApproved = cert.verification_status === 'approved' || cert.verification_status === 'Verified';
          const isRejected = cert.verification_status === 'rejected' || cert.verification_status === 'Rejected';
          notifications.push({
            id: key,
            type: 'certificate',
            title: isApproved ? `Certificate Verified: ${cert.name}` : `Certificate ${isRejected ? 'Rejected' : 'Update'}: ${cert.name}`,
            desc: isApproved 
              ? `Your certificate for ${cert.name} by ${cert.issuer} has been verified.`
              : `Status: ${cert.verification_status}.${cert.staff_comment ? ` Reason: "${cert.staff_comment}"` : ''}`,
            time: formatRelativeTime(cert.updated_at || cert.created_at),
            rawTime: cert.updated_at || cert.created_at || new Date(),
            read: state?.is_read || false,
            link: '/certificates',
            senderName: 'Staff Admin'
          });
        }
      }
    });

    // Sort by most recent
    notifications.sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching student notifications:', error);
    res.status(500).json({ error: 'Server error fetching student notifications' });
  }
});

/**
 * PUT /api/student/notifications/read-all
 */
router.put('/read-all', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const { notificationIds = [] } = req.body;

    if (Array.isArray(notificationIds) && notificationIds.length > 0) {
      const bulkOps = notificationIds.map(key => ({
        updateOne: {
          filter: { student_id: studentId, notification_key: key },
          update: { $set: { is_read: true, read_at: new Date() } },
          upsert: true
        }
      }));
      await StudentNotification.bulkWrite(bulkOps);
    }

    // Mark messages received by student as read
    await Message.updateMany(
      { receiverId: studentId, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'All student notifications marked as read' });
  } catch (error) {
    console.error('Error marking student notifications read:', error);
    res.status(500).json({ error: 'Server error marking student notifications read' });
  }
});

/**
 * PUT /api/student/notifications/:id/read
 */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const notificationKey = req.params.id;

    await StudentNotification.findOneAndUpdate(
      { student_id: studentId, notification_key: notificationKey },
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
    console.error('Error marking student notification read:', error);
    res.status(500).json({ error: 'Server error marking student notification read' });
  }
});

/**
 * DELETE /api/student/notifications/:id
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const studentId = req.user.id;
    const notificationKey = req.params.id;

    await StudentNotification.findOneAndUpdate(
      { student_id: studentId, notification_key: notificationKey },
      { $set: { is_dismissed: true, read_at: new Date() } },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Notification dismissed' });
  } catch (error) {
    console.error('Error dismissing student notification:', error);
    res.status(500).json({ error: 'Server error dismissing student notification' });
  }
});

module.exports = router;
