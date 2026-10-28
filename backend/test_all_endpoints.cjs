const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

async function testAll() {
  await mongoose.connect('mongodb://127.0.0.1:27017/beyond_grades');
  const staff = await User.findOne({ role: 'staff' });
  if (!staff) throw new Error("No staff found");

  const token = jwt.sign({ user: { id: staff.id } }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '5 days' });

  const endpoints = ['students', 'academic-verification', 'certificates', 'internships', 'projects', 'skills'];

  for (const ep of endpoints) {
    await new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: `/api/staff/${ep}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`[${ep}] Status: ${res.statusCode}`);
          if (res.statusCode !== 200) {
            console.log(`[${ep}] Error Body: ${data.substring(0, 200)}`);
          }
          resolve();
        });
      });
      req.on('error', (e) => {
        console.error(`[${ep}] Request error: ${e.message}`);
        resolve();
      });
      req.end();
    });
  }
  mongoose.disconnect();
}

testAll().catch(console.error);
