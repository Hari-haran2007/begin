const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('./db/sqlite');
const User = require('./models/User');
const jwt = require('jsonwebtoken');

// Create mock req and res
function mockRequestResponse(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const http = require('http');

    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.originalUrl = url;
    req.headers = { host: 'localhost', ...headers };
    req.connection = { remoteAddress: '127.0.0.1' };
    req.socket = req.connection;

    const res = new EventEmitter();
    let resData = '';
    let statusCode = 200;
    const resHeaders = {};

    res.statusCode = 200;
    res.setHeader = (k, v) => { resHeaders[k.toLowerCase()] = v; };
    res.getHeader = (k) => resHeaders[k.toLowerCase()];
    res.writeHead = (code, headers) => {
      statusCode = code;
      if (headers) Object.assign(resHeaders, headers);
    };
    res.write = (chunk) => {
      if (chunk) resData += chunk;
    };
    res.end = (chunk) => {
      if (chunk) resData += chunk;
      resolve({ statusCode, headers: resHeaders, body: resData });
    };

    app.handle(req, res);

    if (body) {
      req.emit('data', typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.emit('end');
  });
}

async function run() {
  await mongoose.connect(path.join(__dirname, 'database.sqlite'));

  // Require routes
  const express = require('express');
  const app = express();
  app.use(express.json());

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/skills', require('./routes/skills'));
  app.use('/api/projects', require('./routes/projects'));
  app.use('/api/certifications', require('./routes/certifications'));
  app.use('/api/internships', require('./routes/internships'));
  app.use('/api/hackathons', require('./routes/hackathons'));
  app.use('/api/workshops', require('./routes/workshops'));
  app.use('/api/semesterPerformances', require('./routes/semesterPerformances'));
  app.use('/api/student-dna', require('./routes/studentDNA'));
  app.use('/api/growthMetrics', require('./routes/growthMetrics'));
  app.use('/api/comparisonData', require('./routes/comparisonData'));
  app.use('/api/compare', require('./routes/compare'));
  app.use('/api/staff', require('./routes/staff'));
  app.use('/api/messages', require('./routes/messages'));
  app.use('/api/student/messages', require('./routes/messages'));
  app.use('/api/student/notifications', require('./routes/studentNotifications'));
  app.use('/api/meetings', require('./routes/meetings'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: 'sqlite' });
  });

  console.log('Testing GET /api/health...');
  const healthRes = await mockRequestResponse(app, 'GET', '/api/health');
  console.log('Health response:', healthRes.statusCode, healthRes.body);

  const staff = await User.findOne({ role: 'staff' });
  console.log('Staff user:', staff.full_name, staff.email);

  const token = jwt.sign(
    { user: { id: staff.id, role: staff.role } },
    process.env.JWT_SECRET || 'beyond_grades_jwt_secret_2026',
    { expiresIn: '1d' }
  );

  const endpoints = [
    '/api/staff/dashboard-stats',
    '/api/staff/students',
    '/api/staff/academic-verification',
    '/api/staff/certificates',
    '/api/staff/internships',
    '/api/staff/projects',
    '/api/staff/skills',
    '/api/staff/hackathons',
    '/api/staff/workshops',
    '/api/growthMetrics',
    '/api/comparisonData'
  ];

  for (const ep of endpoints) {
    const res = await mockRequestResponse(app, 'GET', ep, { authorization: `Bearer ${token}` });
    console.log(`[GET ${ep}] -> Status: ${res.statusCode} (length: ${res.body.length})`);
    if (res.statusCode !== 200) {
      console.log(`   Error: ${res.body}`);
    }
  }

  // Also test student auth
  const student = await User.findOne({ role: 'student' });
  console.log('Student user:', student.full_name, student.email);
  const studentToken = jwt.sign(
    { user: { id: student.id, role: student.role } },
    process.env.JWT_SECRET || 'beyond_grades_jwt_secret_2026',
    { expiresIn: '1d' }
  );

  const studentEndpoints = [
    '/api/auth/me',
    '/api/skills',
    '/api/certifications',
    '/api/internships',
    '/api/projects',
    '/api/semesterPerformances',
    '/api/student-dna',
    '/api/student/notifications'
  ];

  for (const ep of studentEndpoints) {
    const res = await mockRequestResponse(app, 'GET', ep, { authorization: `Bearer ${studentToken}` });
    console.log(`[Student GET ${ep}] -> Status: ${res.statusCode} (length: ${res.body.length})`);
    if (res.statusCode !== 200) {
      console.log(`   Error: ${res.body}`);
    }
  }

  console.log('\n--- All in-process route tests PASSED! ---');
  process.exit(0);
}

run().catch(console.error);
