/**
 * Restore / Migration script to migrate backed up records into MongoDB Atlas.
 * Run ONLY after getting MongoDB Atlas URI and explicit approval.
 * 
 * Usage:
 *   node backend/restore_to_atlas.cjs "<ATLAS_MONGODB_URI>" [backup_dir_path]
 */

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const targetUri = process.argv[2] || process.env.ATLAS_MONGODB_URI;
const customBackupDir = process.argv[3];

if (!targetUri) {
  console.error('ERROR: Missing target MongoDB Atlas URI.');
  console.error('Usage: node backend/restore_to_atlas.cjs "<ATLAS_MONGODB_URI>"');
  process.exit(1);
}

// Safety check: Prevent writing to local DB
if (targetUri.includes('127.0.0.1') || targetUri.includes('localhost')) {
  console.error('SAFETY WARNING: Target URI points to localhost. Aborting to protect local database.');
  process.exit(1);
}

const baseBackupDir = path.join(__dirname, '..', 'db_backup');

function findLatestBackupDir() {
  if (customBackupDir && fs.existsSync(customBackupDir)) return customBackupDir;
  if (!fs.existsSync(baseBackupDir)) throw new Error('No backup directory found at ' + baseBackupDir);
  
  const entries = fs.readdirSync(baseBackupDir)
    .filter(f => f.startsWith('backup_'))
    .sort()
    .reverse();
  
  if (entries.length === 0) throw new Error('No backups found in ' + baseBackupDir);
  return path.join(baseBackupDir, entries[0]);
}

async function restore() {
  const backupDir = findLatestBackupDir();
  console.log(`Using backup from: ${backupDir}`);
  console.log('Connecting to target MongoDB Atlas database...');

  await mongoose.connect(targetUri);
  console.log('Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));

  for (const file of files) {
    const colName = path.basename(file, '.json');
    const rawData = fs.readFileSync(path.join(backupDir, file), 'utf8');
    const docs = JSON.parse(rawData);

    if (docs.length === 0) {
      console.log(`Skipping empty collection "${colName}".`);
      continue;
    }

    // Convert string _id and ObjectId references
    const formattedDocs = docs.map(doc => {
      const copy = { ...doc };
      if (copy._id && typeof copy._id === 'string' && /^[0-9a-fA-F]{24}$/.test(copy._id)) {
        copy._id = new mongoose.Types.ObjectId(copy._id);
      }
      if (copy.user_id && typeof copy.user_id === 'string' && /^[0-9a-fA-F]{24}$/.test(copy.user_id)) {
        copy.user_id = new mongoose.Types.ObjectId(copy.user_id);
      }
      return copy;
    });

    // Upsert or insert without overwriting blindly
    const col = db.collection(colName);
    for (const doc of formattedDocs) {
      await col.replaceOne({ _id: doc._id }, doc, { upsert: true });
    }

    console.log(`Successfully migrated ${docs.length} records into collection "${colName}".`);
  }

  console.log('\nAtlas migration completed successfully!');
  await mongoose.disconnect();
}

restore().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
