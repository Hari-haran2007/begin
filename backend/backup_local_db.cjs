const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(__dirname, '..', 'db_backup');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/beyond_grades';

async function backup() {
  console.log('Connecting to local MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(BACKUP_DIR, `backup_${timestamp}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const summary = {};

  for (const col of collections) {
    const colName = col.name;
    const docs = await db.collection(colName).find({}).toArray();
    summary[colName] = docs.length;

    const filePath = path.join(sessionDir, `${colName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`Backed up collection "${colName}": ${docs.length} documents -> ${path.basename(filePath)}`);
  }

  const summaryPath = path.join(sessionDir, '_summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify({ timestamp, summary }, null, 2), 'utf8');

  console.log('\nBackup complete!');
  console.log(`Saved to: ${sessionDir}`);
  console.log('Summary:', summary);

  await mongoose.disconnect();
}

backup().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
