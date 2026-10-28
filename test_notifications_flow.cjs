const mongoose = require('./backend/node_modules/mongoose');
const jwt = require('./backend/node_modules/jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond_grades';

async function runTests() {
  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected for testing');

  const User = require('./backend/models/User');
  const Message = require('./backend/models/Message');
  const Conversation = require('./backend/models/Conversation');
  const StaffNotification = require('./backend/models/StaffNotification');
  const StudentNotification = require('./backend/models/StudentNotification');

  // Find real staff and student
  const staff = await User.findOne({ role: 'staff' });
  const koki = await User.findOne({ full_name: /koki/i, role: 'student' }) || await User.findOne({ role: 'student' });
  let otherStaff = await User.findOne({ role: 'staff', _id: { $ne: staff._id } });

  if (!otherStaff) {
    // Create a secondary faculty user for multi-conversation verification if only one exists
    otherStaff = await User.create({
      full_name: 'Dr. Anand Kumar',
      email: 'anand.faculty@example.com',
      password: 'password123',
      role: 'staff',
      department: 'Computer Science',
      staff_id: 'FAC-CS-002',
      roll_number: 'FAC-CS-002',
      semester: 1
    });
    console.log('Created secondary faculty Dr. Anand Kumar for multi-conversation test');
  }

  console.log(`Staff: ${staff.full_name} (${staff._id})`);
  console.log(`Student Koki: ${koki.full_name} (${koki._id})`);
  console.log(`Other Faculty: ${otherStaff.full_name} (${otherStaff._id})`);

  const staffToken = jwt.sign({ user: { id: staff._id.toString() } }, JWT_SECRET, { expiresIn: '1d' });
  const otherStaffToken = jwt.sign({ user: { id: otherStaff._id.toString() } }, JWT_SECRET, { expiresIn: '1d' });
  const kokiToken = jwt.sign({ user: { id: koki._id.toString() } }, JWT_SECRET, { expiresIn: '1d' });

  // TEST A: Staff sends "Hi Koki, please check your academic details."
  console.log('\n--- EXECUTING TEST A: Staff -> Koki ---');
  const msgTextA = "Hi Koki, please check your academic details.";
  const sendResA = await fetch(`http://localhost:5000/api/messages/${koki._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ message: msgTextA })
  });
  const sendDataA = await sendResA.json();
  console.log('Staff message sent response status:', sendResA.status, sendDataA.success ? 'SUCCESS' : 'FAILED');

  // Koki checks notification bell API
  const kokiNotifRes = await fetch('http://localhost:5000/api/student/notifications', {
    headers: { Authorization: `Bearer ${kokiToken}` }
  });
  const kokiNotifs = await kokiNotifRes.json();
  console.log(`Koki received ${kokiNotifs.length} total notifications`);
  const messageNotifForKoki = kokiNotifs.find(n => n.type === 'message' && n.desc.includes(msgTextA));
  if (!messageNotifForKoki) {
    throw new Error('TEST A FAILED: Message notification not found in Koki notifications!');
  }
  console.log('TEST A Notification Verified:', {
    title: messageNotifForKoki.title,
    desc: messageNotifForKoki.desc,
    read: messageNotifForKoki.read,
    link: messageNotifForKoki.link
  });

  // TEST B: Koki replies "Hi sir, I will check it."
  console.log('\n--- EXECUTING TEST B: Koki -> Staff ---');
  const msgTextB = "Hi sir, I will check it.";
  const sendResB = await fetch(`http://localhost:5000/api/messages/${staff._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${kokiToken}` },
    body: JSON.stringify({ message: msgTextB })
  });
  const sendDataB = await sendResB.json();
  console.log('Koki reply sent response status:', sendResB.status, sendDataB.success ? 'SUCCESS' : 'FAILED');

  // Staff checks notification bell API
  const staffNotifRes = await fetch('http://localhost:5000/api/staff/notifications', {
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  const staffNotifs = await staffNotifRes.json();
  console.log(`Staff received ${staffNotifs.length} total notifications`);
  const messageNotifForStaff = staffNotifs.find(n => n.type === 'message' && n.desc.includes(msgTextB));
  if (!messageNotifForStaff) {
    throw new Error('TEST B FAILED: Message notification not found in Staff notifications!');
  }
  console.log('TEST B Notification Verified:', {
    title: messageNotifForStaff.title,
    desc: messageNotifForStaff.desc,
    read: messageNotifForStaff.read,
    link: messageNotifForStaff.link
  });

  // TEST C: Multiple Real Faculty Conversations
  console.log('\n--- EXECUTING TEST C: Multiple Faculty Conversations for Koki ---');
  const msgTextC = "Your meeting is confirmed.";
  await fetch(`http://localhost:5000/api/messages/${koki._id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${otherStaffToken}` },
    body: JSON.stringify({ message: msgTextC })
  });

  const kokiConvRes = await fetch('http://localhost:5000/api/messages/conversations', {
    headers: { Authorization: `Bearer ${kokiToken}` }
  });
  const kokiConversations = await kokiConvRes.json();
  console.log(`Koki has ${kokiConversations.length} faculty conversation(s):`);
  kokiConversations.forEach((c, idx) => {
    console.log(`  [${idx + 1}] Partner: ${c.partner?.full_name} (${c.partner?.department}) | Latest: "${c.lastMessage}" | Unread: ${c.unreadCount}`);
  });

  if (kokiConversations.length < 2) {
    throw new Error('TEST C FAILED: Expected at least 2 distinct faculty conversations for Koki');
  }

  // Verify conversation isolation
  const conv1MessagesRes = await fetch(`http://localhost:5000/api/messages/${staff._id}`, {
    headers: { Authorization: `Bearer ${kokiToken}` }
  });
  const conv1Data = await conv1MessagesRes.json();
  const conv2MessagesRes = await fetch(`http://localhost:5000/api/messages/${otherStaff._id}`, {
    headers: { Authorization: `Bearer ${kokiToken}` }
  });
  const conv2Data = await conv2MessagesRes.json();

  const conv1HasOtherMsg = conv1Data.messages.some(m => m.message === msgTextC);
  const conv2HasFirstMsg = conv2Data.messages.some(m => m.message === msgTextA);

  if (conv1HasOtherMsg || conv2HasFirstMsg) {
    throw new Error('TEST C FAILED: Message leakage detected between distinct faculty conversations!');
  }
  console.log('TEST C Verified: Distinct conversations isolated with 0 message mixing.');

  // TEST D: Mark Read & Persistence Check
  console.log('\n--- EXECUTING TEST D: Read Status & Persistence ---');
  // Mark Koki notification as read
  await fetch(`http://localhost:5000/api/student/notifications/${messageNotifForKoki.id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${kokiToken}` }
  });

  const kokiNotifAfterReadRes = await fetch('http://localhost:5000/api/student/notifications', {
    headers: { Authorization: `Bearer ${kokiToken}` }
  });
  const kokiNotifsAfterRead = await kokiNotifAfterReadRes.json();
  const updatedNotifKoki = kokiNotifsAfterRead.find(n => n.id === messageNotifForKoki.id);
  console.log(`Koki notification read status after update: ${updatedNotifKoki?.read} (Expected: true)`);
  if (!updatedNotifKoki?.read) {
    throw new Error('TEST D FAILED: Notification did not persist read status');
  }

  console.log('\n>>> ALL TEST CASES (A, B, C, D) PASSED SUCCESSFULLY! <<<\n');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
