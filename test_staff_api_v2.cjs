const mongoose = require('mongoose');
const express = require('express');
const staffRoutes = require('./backend/routes/staff');
const authMiddleware = require('./backend/middleware/auth');
const User = require('./backend/models/User');

const app = express();
app.use(express.json());

// Mock auth middleware to inject a staff user
app.use((req, res, next) => {
  // We will set req.user to a staff user
  req.user = { id: 'staff_test_id' };
  next();
});

// Since checkStaff uses User.findById, let's mock it
const originalFindById = User.findById;
User.findById = function(id) {
  if (id === 'staff_test_id') {
    return Promise.resolve({ _id: 'staff_test_id', role: 'staff' });
  }
  return originalFindById.apply(this, arguments);
};

app.use('/api/staff', staffRoutes);

const request = require('http').request;

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/beyond_grades');
  
  const server = app.listen(5001, () => {
    console.log('Test server running');
    
    const endpoints = ['students', 'academic-verification', 'certificates', 'internships', 'projects', 'skills'];
    
    const runTest = async (index) => {
      if (index >= endpoints.length) {
        server.close();
        mongoose.disconnect();
        return;
      }
      
      const ep = endpoints[index];
      console.log(`\nTesting GET /api/staff/${ep}`);
      
      const req = request(`http://localhost:5001/api/staff/${ep}`, { method: 'GET' }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`Status: ${res.statusCode}`);
          if (res.statusCode !== 200) {
            console.log(`Response: ${data}`);
          } else {
            console.log(`Success! Response length: ${data.length}`);
          }
          runTest(index + 1);
        });
      });
      req.on('error', e => console.error(e));
      req.end();
    };
    
    runTest(0);
  });
}

test().catch(console.error);
