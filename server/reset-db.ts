import dotenv from 'dotenv';

dotenv.config();

// Clears every MySQL table and re-inserts the CMU demo dataset (accounts, events, survey, evaluations).
const { db } = await import('./repository.ts');

await db.init();
await db.seedInitialData();

const stats = await db.getAdminDashboardStats();
console.log(
  `MySQL database reseeded: ${stats.total_events} events, ${stats.total_students} students, ` +
    `${stats.total_registrations} registrations, ${stats.total_attended} attended, ${stats.total_evaluations} evaluations.`,
);
await db.close();
