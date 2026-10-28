const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const auth = require('../middleware/auth');

/**
 * Auto-sync orphan messages into Conversation collection
 */
async function syncConversationsForUser(userId) {
  try {
    // Find all distinct message pairs involving this user
    const messages = await Message.find({
      $or: [
        { senderId: userId },
        { receiverId: userId },
        { studentId: userId },
        { staffId: userId }
      ]
    }).sort({ created_at: -1 }).lean();

    const pairMap = new Map();

    for (const msg of messages) {
      let studentId = msg.studentId;
      let staffId = msg.staffId;

      if (!studentId || !staffId) {
        if (msg.senderRole === 'staff') {
          staffId = msg.senderId;
          studentId = msg.receiverId;
        } else {
          studentId = msg.senderId;
          staffId = msg.receiverId;
        }
      }

      if (!studentId || !staffId) continue;

      const key = `${studentId.toString()}_${staffId.toString()}`;
      if (!pairMap.has(key)) {
        pairMap.set(key, {
          studentId,
          staffId,
          lastMessage: msg.message,
          lastMessageAt: msg.created_at
        });
      }
    }

    // Upsert conversation records
    for (const [, pair] of pairMap) {
      let conv = await Conversation.findOne({ studentId: pair.studentId, staffId: pair.staffId });
      if (!conv) {
        conv = new Conversation({
          studentId: pair.studentId,
          staffId: pair.staffId,
          lastMessage: pair.lastMessage,
          lastMessageAt: pair.lastMessageAt,
          unreadByStudent: 0,
          unreadByStaff: 0
        });
        await conv.save();
      }

      // Update message conversationIds if missing
      await Message.updateMany(
        {
          studentId: pair.studentId,
          staffId: pair.staffId,
          conversationId: { $exists: false }
        },
        { $set: { conversationId: conv._id } }
      );
    }
  } catch (err) {
    console.error('Error in syncConversationsForUser:', err);
  }
}

/**
 * Helper: Format proper display name dynamically from database values
 */
function formatDisplayName(name, fallback = 'User') {
  if (!name || typeof name !== 'string') return fallback;
  let trimmed = name.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null' || trimmed === '[object Object]') {
    return fallback;
  }
  if (trimmed.includes('@')) {
    const cleaned = trimmed.split('@')[0].trim();
    if (!cleaned) return fallback;
    trimmed = cleaned;
  }
  if (trimmed === trimmed.toLowerCase()) {
    return trimmed
      .split(/\s+/)
      .map(word => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
      .join(' ');
  }
  return trimmed;
}

/**
 * GET /api/messages/conversations
 * GET /api/messages/student
 * Get all conversations for current user
 */
const getConversationsHandler = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId).lean();
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Auto-sync any existing messages to Conversation model
    await syncConversationsForUser(currentUserId);

    const isStaff = currentUser.role === 'staff';

    if (isStaff) {
      // Staff view: return all conversations involving this staff member
      const conversations = await Conversation.find({ staffId: currentUserId })
        .populate('studentId', 'full_name name roll_number department semester avatar_url role')
        .populate('staffId', 'full_name name email department avatar_url staff_id role')
        .sort({ lastMessageAt: -1 })
        .lean();

      const formatted = await Promise.all(conversations.map(async c => {
        const rawPartner = c.studentId;
        const partnerFallback = 'Student';
        const partnerName = formatDisplayName(rawPartner?.full_name || rawPartner?.name, partnerFallback);

        const partner = rawPartner ? {
          ...rawPartner,
          id: rawPartner._id,
          _id: rawPartner._id,
          full_name: partnerName,
          name: partnerName
        } : {
          _id: c.studentId,
          id: c.studentId,
          full_name: partnerFallback,
          name: partnerFallback,
          department: 'Academic'
        };

        const realUnread = await Message.countDocuments({
          conversationId: c._id,
          receiverId: currentUserId,
          read: false
        });

        return {
          id: c._id,
          _id: c._id,
          conversationId: c._id,
          student: c.studentId,
          staff: c.staffId,
          partner: partner,
          lastMessage: c.lastMessage || '',
          lastMessageAt: c.lastMessageAt || c.created_at,
          unreadCount: realUnread,
          created_at: c.created_at
        };
      }));

      return res.json(formatted);
    }

    // Student view: Return eligible faculty mentors for the student with their conversation status
    // 1. Fetch all available faculty/staff members
    let facultyMembers = await User.find({
      role: { $in: ['staff', 'Staff', 'faculty', 'Faculty'] }
    }).select('-password').lean();

    // 2. Also include any staff users who have messaged with this student
    const studentMessages = await Message.find({
      $or: [
        { senderId: currentUserId },
        { receiverId: currentUserId },
        { studentId: currentUserId }
      ]
    }).lean();

    const otherUserIds = new Set();
    studentMessages.forEach(m => {
      const sId = m.senderId?.toString();
      const rId = m.receiverId?.toString();
      const staffRef = m.staffId?.toString();
      if (sId && sId !== currentUserId.toString()) otherUserIds.add(sId);
      if (rId && rId !== currentUserId.toString()) otherUserIds.add(rId);
      if (staffRef && staffRef !== currentUserId.toString()) otherUserIds.add(staffRef);
    });

    const knownFacultyIds = new Set(facultyMembers.map(f => f._id.toString()));
    const missingIds = Array.from(otherUserIds).filter(id => !knownFacultyIds.has(id));
    if (missingIds.length > 0) {
      const extraStaff = await User.find({
        _id: { $in: missingIds },
        role: { $ne: 'student' }
      }).select('-password').lean();
      facultyMembers.push(...extraStaff);
    }

    // 3. Fetch existing conversations involving this student
    const existingConvs = await Conversation.find({
      $or: [
        { studentId: currentUserId },
        { staffId: currentUserId }
      ]
    })
      .populate('staffId', 'full_name name email department avatar_url staff_id role')
      .populate('studentId', 'full_name name email department avatar_url staff_id role')
      .lean();

    const convByStaffId = new Map();
    for (const c of existingConvs) {
      const sId = c.staffId?._id ? c.staffId._id.toString() : (c.staffId ? c.staffId.toString() : null);
      const studentSideId = c.studentId?._id ? c.studentId._id.toString() : (c.studentId ? c.studentId.toString() : null);
      const otherId = sId === currentUserId.toString() ? studentSideId : sId;
      if (otherId) {
        convByStaffId.set(otherId, c);
      }
    }

    // 4. Format faculty list with conversation details
    const formatted = await Promise.all(facultyMembers.map(async faculty => {
      const fId = faculty._id.toString();
      const existing = convByStaffId.get(fId);

      // Get latest message directly from Message collection to guarantee accuracy
      const lastMsg = await Message.findOne({
        $or: [
          { senderId: currentUserId, receiverId: faculty._id },
          { senderId: faculty._id, receiverId: currentUserId },
          { studentId: currentUserId, staffId: faculty._id },
          { staffId: faculty._id, studentId: currentUserId }
        ]
      }).sort({ created_at: -1 }).lean();

      // Count unread messages from this faculty to student
      const realUnread = await Message.countDocuments({
        receiverId: currentUserId,
        senderId: faculty._id,
        read: false
      });

      const facultyDisplayName = formatDisplayName(faculty.full_name || faculty.name, 'Faculty Mentor');
      const facultyDept = faculty.department || 'Academic Faculty';
      const facultyEmail = faculty.email || '';
      const facultyAvatar = faculty.avatar_url || '';
      const facultyRole = faculty.role || 'staff';
      const convId = existing?._id ? existing._id.toString() : `faculty-${fId}`;

      const partnerObj = {
        id: fId,
        _id: fId,
        full_name: facultyDisplayName,
        name: facultyDisplayName,
        email: facultyEmail,
        roll_number: faculty.roll_number || '',
        department: facultyDept,
        avatar_url: facultyAvatar,
        role: facultyRole,
        staff_id: faculty.staff_id || ''
      };

      return {
        id: convId,
        _id: convId,
        conversationId: existing?._id ? existing._id.toString() : convId,
        studentId: currentUserId,
        staffId: fId,
        student: currentUser,
        staff: partnerObj,
        partner: partnerObj,
        lastMessage: lastMsg?.message || existing?.lastMessage || '',
        lastMessageAt: lastMsg?.created_at || existing?.lastMessageAt || null,
        unreadCount: realUnread,
        created_at: lastMsg?.created_at || existing?.created_at || faculty.created_at || new Date()
      };
    }));

    // 5. Sort: conversations with latest messages first, then mentors in student's department, then alphabetical
    const studentDept = currentUser.department || '';
    formatted.sort((a, b) => {
      if (a.lastMessageAt && b.lastMessageAt) {
        return new Date(b.lastMessageAt) - new Date(a.lastMessageAt);
      }
      if (a.lastMessageAt) return -1;
      if (b.lastMessageAt) return 1;

      // Department priority
      const aInDept = a.partner?.department === studentDept;
      const bInDept = b.partner?.department === studentDept;
      if (aInDept && !bInDept) return -1;
      if (!aInDept && bInDept) return 1;

      return (a.partner?.full_name || '').localeCompare(b.partner?.full_name || '');
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server error fetching conversations' });
  }
};

router.get('/', auth, getConversationsHandler);
router.get('/conversations', auth, getConversationsHandler);
router.get('/student', auth, getConversationsHandler);
router.get('/faculty', auth, getConversationsHandler);
router.get('/mentors', auth, getConversationsHandler);

/**
 * GET /api/messages/unread-count
 */
router.get('/unread-count', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const count = await Message.countDocuments({
      receiverId: currentUserId,
      read: false
    });
    res.json({ unreadCount: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Server error fetching unread count' });
  }
});

/**
 * GET /api/messages/conversation/:conversationIdOrPartnerId
 * GET /api/messages/:partnerId
 */
const getConversationDetailsHandler = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const targetParam = req.params.conversationId || req.params.partnerId;

    const currentUser = await User.findById(currentUserId).lean();
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    let conv = null;
    let partner = null;

    // Check if targetParam is a Conversation ID
    if (targetParam && targetParam.match(/^[0-9a-fA-F]{24}$/)) {
      conv = await Conversation.findById(targetParam)
        .populate('studentId', 'full_name roll_number department semester avatar_url role')
        .populate('staffId', 'full_name email department avatar_url staff_id role')
        .lean();
    }

    if (conv) {
      partner = currentUser.role === 'staff' ? conv.studentId : conv.staffId;
    } else {
      // Treat targetParam as partner User ID or roll_number
      if (targetParam && targetParam.match(/^[0-9a-fA-F]{24}$/)) {
        partner = await User.findById(targetParam).select('-password').lean();
      }
      if (!partner && targetParam) {
        partner = await User.findOne({ roll_number: targetParam }).select('-password').lean();
      }

      if (!partner) {
        return res.status(404).json({ error: 'User or conversation not found' });
      }

      const isStaff = currentUser.role === 'staff';
      const staffId = isStaff ? currentUser._id : partner._id;
      const studentId = isStaff ? partner._id : currentUser._id;

      conv = await Conversation.findOne({ staffId, studentId });
      if (!conv) {
        conv = new Conversation({
          staffId,
          studentId,
          lastMessage: '',
          lastMessageAt: new Date()
        });
        await conv.save();
      }
    }

    const partnerId = partner?._id || (currentUser.role === 'staff' ? conv.studentId : conv.staffId);

    // Mark messages received by current user as read
    await Message.updateMany(
      { receiverId: currentUserId, senderId: partnerId, read: false },
      { $set: { read: true } }
    );

    // Reset unread count
    if (currentUser.role === 'staff') {
      await Conversation.findByIdAndUpdate(conv._id || conv.id, { $set: { unreadByStaff: 0 } });
    } else {
      await Conversation.findByIdAndUpdate(conv._id || conv.id, { $set: { unreadByStudent: 0 } });
    }

    // Fetch messages for this conversation / pair with populated sender and receiver
    const messages = await Message.find({
      $or: [
        { conversationId: conv._id || conv.id },
        { senderId: currentUserId, receiverId: partnerId },
        { senderId: partnerId, receiverId: currentUserId }
      ]
    })
      .populate('senderId', 'full_name name email role avatar_url department staff_id roll_number')
      .populate('receiverId', 'full_name name email role avatar_url department staff_id roll_number')
      .sort({ created_at: 1 })
      .lean();

    const formatted = messages.map(m => {
      const senderObj = m.senderId && typeof m.senderId === 'object' && m.senderId._id ? m.senderId : null;
      const receiverObj = m.receiverId && typeof m.receiverId === 'object' && m.receiverId._id ? m.receiverId : null;

      const sId = senderObj ? senderObj._id.toString() : (m.senderId ? m.senderId.toString() : '');
      const rId = receiverObj ? receiverObj._id.toString() : (m.receiverId ? m.receiverId.toString() : '');

      const sRole = m.senderRole || senderObj?.role || (sId === currentUserId.toString() ? currentUser.role : 'staff');
      const rRole = m.receiverRole || receiverObj?.role || (sRole === 'staff' ? 'student' : 'staff');

      const sFallback = sRole === 'staff' ? 'Faculty Mentor' : 'Student';
      const rFallback = rRole === 'staff' ? 'Faculty Mentor' : 'Student';

      const sName = formatDisplayName(senderObj?.full_name || senderObj?.name, sFallback);
      const rName = formatDisplayName(receiverObj?.full_name || receiverObj?.name, rFallback);

      const isSelf = sId === currentUserId.toString();
      const isStaffMsg = sRole === 'staff';

      return {
        id: m._id,
        _id: m._id,
        conversationId: conv._id || conv.id,
        senderId: sId,
        sender: senderObj ? {
          _id: senderObj._id,
          id: senderObj._id,
          full_name: sName,
          name: sName,
          email: senderObj.email || '',
          role: senderObj.role || sRole,
          department: senderObj.department || '',
          avatar_url: senderObj.avatar_url || ''
        } : undefined,
        senderName: sName,
        sender_name: sName,
        senderRole: sRole,
        receiverId: rId,
        receiver: receiverObj ? {
          _id: receiverObj._id,
          id: receiverObj._id,
          full_name: rName,
          name: rName,
          email: receiverObj.email || '',
          role: receiverObj.role || rRole,
          department: receiverObj.department || '',
          avatar_url: receiverObj.avatar_url || ''
        } : undefined,
        receiverName: rName,
        receiverRole: rRole,
        studentId: m.studentId,
        staffId: m.staffId,
        message: m.message,
        read: m.read,
        is_edited: m.is_edited || false,
        edited: m.is_edited || false,
        created_at: m.created_at,
        updated_at: m.updated_at,
        isSelf: isSelf,
        isStaff: isStaffMsg
      };
    });

    const partnerRole = partner?.role || (currentUser.role === 'staff' ? 'student' : 'staff');
    const defaultPartnerFallback = partnerRole === 'staff' ? 'Faculty Mentor' : 'Student';
    const partnerDisplayName = formatDisplayName(partner?.full_name || partner?.name, defaultPartnerFallback);

    res.json({
      conversationId: conv._id || conv.id,
      conversation: conv,
      partner: {
        id: partner?._id || partnerId,
        _id: partner?._id || partnerId,
        full_name: partnerDisplayName,
        name: partnerDisplayName,
        email: partner?.email || '',
        roll_number: partner?.roll_number || '',
        department: partner?.department || '',
        semester: partner?.semester || 1,
        avatar_url: partner?.avatar_url || '',
        role: partnerRole,
        staff_id: partner?.staff_id || ''
      },
      messages: formatted
    });
  } catch (error) {
    console.error('Error fetching conversation details:', error);
    res.status(500).json({ error: 'Server error fetching conversation details' });
  }
};

router.get('/conversation/:conversationId', auth, getConversationDetailsHandler);
router.get('/:partnerId', auth, getConversationDetailsHandler);

/**
 * POST /api/messages
 * POST /api/messages/:partnerId
 * Send a message
 */
const sendMessageHandler = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const partnerParam = req.params.partnerId || req.body.receiverId || req.body.studentId || req.body.staffId;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const currentUser = await User.findById(currentUserId).lean();
    if (!currentUser) {
      return res.status(401).json({ error: 'User not found' });
    }

    let partner = null;
    if (partnerParam && partnerParam.match(/^[0-9a-fA-F]{24}$/)) {
      partner = await User.findById(partnerParam);
    }
    if (!partner && partnerParam) {
      partner = await User.findOne({ roll_number: partnerParam });
    }

    if (!partner) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const isStaff = currentUser.role === 'staff';
    const staffId = isStaff ? currentUser._id : partner._id;
    const studentId = isStaff ? partner._id : currentUser._id;

    // Get or create conversation
    let conv = await Conversation.findOne({ staffId, studentId });
    if (!conv) {
      conv = new Conversation({
        staffId,
        studentId,
        lastMessage: message.trim(),
        lastMessageAt: new Date(),
        unreadByStaff: isStaff ? 0 : 1,
        unreadByStudent: isStaff ? 1 : 0
      });
    } else {
      conv.lastMessage = message.trim();
      conv.lastMessageAt = new Date();
      if (isStaff) {
        conv.unreadByStudent = (conv.unreadByStudent || 0) + 1;
      } else {
        conv.unreadByStaff = (conv.unreadByStaff || 0) + 1;
      }
    }
    await conv.save();

    const newMsg = new Message({
      conversationId: conv._id,
      senderId: currentUser._id,
      senderRole: currentUser.role || (isStaff ? 'staff' : 'student'),
      receiverId: partner._id,
      receiverRole: partner.role || (isStaff ? 'student' : 'staff'),
      studentId: studentId,
      staffId: staffId,
      message: message.trim(),
      read: false,
      created_at: new Date()
    });

    await newMsg.save();

    const partnerRole = partner.role || (isStaff ? 'student' : 'staff');
    const defaultPartnerFallback = partnerRole === 'staff' ? 'Faculty Mentor' : 'Student';
    const partnerDisplayName = formatDisplayName(partner.full_name || partner.name, defaultPartnerFallback);
    const currentDisplayName = formatDisplayName(currentUser.full_name || currentUser.name, isStaff ? 'Faculty Mentor' : 'Student');

    res.status(201).json({
      success: true,
      message: {
        id: newMsg._id,
        _id: newMsg._id,
        conversationId: conv._id,
        senderId: currentUser._id.toString(),
        sender: {
          _id: currentUser._id,
          id: currentUser._id,
          full_name: currentDisplayName,
          name: currentDisplayName,
          email: currentUser.email || '',
          role: currentUser.role || (isStaff ? 'staff' : 'student'),
          department: currentUser.department || '',
          avatar_url: currentUser.avatar_url || ''
        },
        senderName: currentDisplayName,
        sender_name: currentDisplayName,
        senderRole: newMsg.senderRole,
        receiverId: partner._id.toString(),
        receiver: {
          _id: partner._id,
          id: partner._id,
          full_name: partnerDisplayName,
          name: partnerDisplayName,
          email: partner.email || '',
          role: partner.role || partnerRole,
          department: partner.department || '',
          avatar_url: partner.avatar_url || ''
        },
        receiverName: partnerDisplayName,
        receiverRole: newMsg.receiverRole,
        studentId: newMsg.studentId,
        staffId: newMsg.staffId,
        message: newMsg.message,
        read: newMsg.read,
        created_at: newMsg.created_at,
        isSelf: true,
        isStaff: newMsg.senderRole === 'staff'
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Server error sending message' });
  }
};

router.post('/', auth, sendMessageHandler);
router.post('/:partnerId', auth, sendMessageHandler);

/**
 * PATCH /api/messages/:conversationId/read
 */
router.patch('/:conversationId/read', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { conversationId } = req.params;

    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await Message.updateMany(
      { conversationId: conv._id, receiverId: currentUserId, read: false },
      { $set: { read: true } }
    );

    const currentUser = await User.findById(currentUserId);
    if (currentUser?.role === 'staff') {
      conv.unreadByStaff = 0;
    } else {
      conv.unreadByStudent = 0;
    }
    await conv.save();

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking conversation read:', error);
    res.status(500).json({ error: 'Server error marking read' });
  }
});

/**
 * PATCH /api/messages/:messageId
 * PUT /api/messages/:messageId
 * Edit an existing message (Sender only)
 */
const editMessageHandler = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const existingMsg = await Message.findById(messageId);
    if (!existingMsg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Security check: Only sender can edit their own message
    if (existingMsg.senderId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only edit your own messages' });
    }

    existingMsg.message = message.trim();
    existingMsg.is_edited = true;
    existingMsg.updated_at = new Date();
    await existingMsg.save();

    // If this was the last message in conversation, update conversation.lastMessage
    if (existingMsg.conversationId) {
      const conv = await Conversation.findById(existingMsg.conversationId);
      if (conv) {
        const newest = await Message.findOne({ conversationId: existingMsg.conversationId }).sort({ created_at: -1 });
        if (newest && newest._id.toString() === existingMsg._id.toString()) {
          conv.lastMessage = existingMsg.message;
          await conv.save();
        }
      }
    }

    const currentUser = await User.findById(currentUserId).lean();
    const isStaffMsg = existingMsg.senderRole === 'staff';
    const defaultName = isStaffMsg ? 'Faculty Mentor' : 'Student';
    const currentDisplayName = formatDisplayName(currentUser?.full_name || currentUser?.name, defaultName);

    res.json({
      success: true,
      message: {
        id: existingMsg._id,
        _id: existingMsg._id,
        conversationId: existingMsg.conversationId,
        senderId: existingMsg.senderId.toString(),
        senderName: currentDisplayName,
        sender_name: currentDisplayName,
        senderRole: existingMsg.senderRole,
        receiverId: existingMsg.receiverId.toString(),
        receiverRole: existingMsg.receiverRole,
        studentId: existingMsg.studentId,
        staffId: existingMsg.staffId,
        message: existingMsg.message,
        read: existingMsg.read,
        is_edited: true,
        edited: true,
        created_at: existingMsg.created_at,
        updated_at: existingMsg.updated_at,
        isSelf: true,
        isStaff: isStaffMsg
      }
    });
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Server error editing message' });
  }
};

router.patch('/:messageId', auth, editMessageHandler);
router.put('/:messageId', auth, editMessageHandler);

/**
 * DELETE /api/messages/:messageId
 * Delete an existing message (Sender only)
 */
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    const existingMsg = await Message.findById(messageId);
    if (!existingMsg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Security check: Only sender can delete their own message
    if (existingMsg.senderId.toString() !== currentUserId.toString()) {
      return res.status(403).json({ error: 'Unauthorized: You can only delete your own messages' });
    }

    const conversationId = existingMsg.conversationId;
    await Message.findByIdAndDelete(messageId);

    // Update conversation lastMessage
    if (conversationId) {
      const conv = await Conversation.findById(conversationId);
      if (conv) {
        const latestMsg = await Message.findOne({ conversationId }).sort({ created_at: -1 });
        if (latestMsg) {
          conv.lastMessage = latestMsg.message;
          conv.lastMessageAt = latestMsg.created_at;
        } else {
          conv.lastMessage = '';
          conv.lastMessageAt = conv.created_at || new Date();
        }
        await conv.save();
      }
    }

    res.json({
      success: true,
      messageId: messageId,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Server error deleting message' });
  }
});

module.exports = router;
