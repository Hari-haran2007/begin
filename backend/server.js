
const express = require('express');
const mongoose = require('./db/sqlite');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const app = express();

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'https://begin-s80l.onrender.com'
    ];

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ]
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database Connection (SQLite)
const SQLITE_DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.join(__dirname, 'database.sqlite');

mongoose.connect(SQLITE_DB_PATH)
  .then(() => console.log('SQLite database connected'))
  .catch(err => console.error('SQLite connection error:', err));

// Routes
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
app.use('/api/ai', require('./routes/ai').router);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    dbState: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected',
    database: 'sqlite'
  });
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Beyond Grades API',
    status: 'active',
    version: '1.0.0',
    database: 'sqlite'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER ERROR]:', err);

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Invalid or missing authentication token'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
