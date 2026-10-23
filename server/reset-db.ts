import fs from 'fs';
import path from 'path';

// Rebuilds data/database.json from the seed in db.ts, keeping a backup of the previous file.
const dbFile = path.resolve(process.cwd(), 'data', 'database.json');
if (fs.existsSync(dbFile)) {
  const backup = dbFile.replace(/\.json$/, '.backup.json');
  fs.copyFileSync(dbFile, backup);
  console.log(`Previous database backed up to ${path.relative(process.cwd(), backup)}`);
}

const { db } = await import('./db');
db.seedInitialData();

const stats = db.getAdminDashboardStats();
console.log(
  `Database reseeded: ${stats.total_events} events, ${stats.total_students} students, ` +
    `${stats.total_registrations} registrations, ${stats.total_attended} attended, ${stats.total_evaluations} evaluations.`
);
