const mongoose = require('mongoose');
const express = require('express');
const authRoutes = require('./routes/auth');
const staffRoutes = require('./routes/staff');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/beyond_grades');
  console.log('Connected to DB');

  const server = app.listen(5002, async () => {
    console.log('Test server running on port 5002');

    const User = require('./models/User');
    let staff = await User.findOne({ role: 'staff' });
    if (!staff) {
      staff = new User({
        full_name: 'Test Staff',
        email: 'staff2@test.com',
        password: 'password', 
        roll_number: 'STAFF2',
        department: 'Admin',
        semester: 1,
        role: 'staff'
      });
      await staff.save();
    }

    const token = jwt.sign({ user: { id: staff.id } }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '5 days' });
    
    const request = require('http').request;
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: '/api/staff/students',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data.substring(0, 500)}`);
        server.close();
        mongoose.disconnect();
      });
    });

    req.on('error', (e) => {
      console.error(`Request error: ${e.message}`);
      server.close();
      mongoose.disconnect();
    });

    req.end();
  });
}

test().catch(console.error);
