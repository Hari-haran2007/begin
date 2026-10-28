const mongoose = require('mongoose');
const User = require('./models/User');
const jwt = require('jsonwebtoken');
const http = require('http');

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/beyond_grades');
  console.log('Connected to DB');

  let staff = await User.findOne({ role: 'staff' });
  if (!staff) {
    staff = new User({
      full_name: 'Test Staff',
      email: 'staff@test.com',
      password: 'password', // hashed in real, but we bypass login and just sign token
      roll_number: 'STAFF1',
      department: 'Admin',
      semester: 1,
      role: 'staff'
    });
    await staff.save();
  }

  const token = jwt.sign({ user: { id: staff.id } }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '5 days' });
  
  console.log('Got token, testing endpoint...');

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/staff/students',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Body: ${data}`);
      mongoose.disconnect();
    });
  });

  req.on('error', (e) => {
    console.error(`Request error: ${e.message}`);
    mongoose.disconnect();
  });

  req.end();
}

test().catch(console.error);
