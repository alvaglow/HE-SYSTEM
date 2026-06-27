#!/usr/bin/env node
/**
 * HP System — Firestore + Auth seeder
 * ----------------------------------------------------------------------------
 * Creates the 6 demo portal users (Auth + Firestore profile) and a small set of
 * sample records so the LIVE app is usable immediately after deployment.
 *
 * Usage:
 *   1. Firebase Console → Project Settings → Service accounts → "Generate new
 *      private key". Save the file as  serviceAccountKey.json  in this folder.
 *   2. npm install
 *   3. node seed.js            # create/refresh users + sample data
 *      node seed.js --wipe     # delete seeded sample docs first, then reseed
 *
 * Safe to run repeatedly — it is idempotent (users are matched by email,
 * sample docs use deterministic IDs and are written with merge).
 *
 * Login after seeding (default password below, override with SEED_PASSWORD):
 *   student@hp.edu · teacher@hp.edu · admin@hp.edu
 *   management@hp.edu · partner@hp.edu · parent@hp.edu
 */
const admin = require('firebase-admin');
const path = require('path');

const KEY = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, 'serviceAccountKey.json');
const PASSWORD = process.env.SEED_PASSWORD || 'HpDemo!2026';
const WIPE = process.argv.includes('--wipe');

let serviceAccount;
try {
  serviceAccount = require(KEY);
} catch (e) {
  console.error('\n✖ Could not load service account key at:\n  ' + KEY +
    '\n  Generate one in Firebase Console → Project Settings → Service accounts,' +
    '\n  save it as serviceAccountKey.json in this folder, then re-run.\n');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const auth = admin.auth();
const db = admin.firestore();

const USERS = [
  { email: 'student@hp.edu',    role: 'student',    name: 'Nguyen Van An',  avatar: 'NVA' },
  { email: 'teacher@hp.edu',    role: 'teacher',    name: 'Sarah Thompson', avatar: 'ST'  },
  { email: 'admin@hp.edu',      role: 'admin',      name: 'Tran Thi Minh',  avatar: 'TTM' },
  { email: 'management@hp.edu', role: 'management', name: 'Michael Chen',   avatar: 'MC'  },
  { email: 'partner@hp.edu',    role: 'partner',    name: 'Le Hoang Nam',   avatar: 'LHN' },
  { email: 'parent@hp.edu',     role: 'parent',     name: 'Pham Thi Lan',   avatar: 'PTL' },
];

const now = admin.firestore.FieldValue.serverTimestamp();

async function upsertUser(u) {
  let rec;
  try {
    rec = await auth.getUserByEmail(u.email);
    await auth.updateUser(rec.uid, { password: PASSWORD, displayName: u.name, emailVerified: true });
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      rec = await auth.createUser({ email: u.email, password: PASSWORD, displayName: u.name, emailVerified: true });
    } else { throw e; }
  }
  // Custom claim so security rules / clients can read role from the token too
  await auth.setCustomUserClaims(rec.uid, { role: u.role });
  await db.collection('users').doc(rec.uid).set({
    uid: rec.uid, email: u.email, role: u.role, name: u.name, avatar: u.avatar,
    createdAt: now, lastLogin: null,
  }, { merge: true });
  console.log(`  ✓ ${u.role.padEnd(11)} ${u.email}  (uid ${rec.uid})`);
  return rec.uid;
}

async function seedSamples(uidByRole) {
  // Deterministic IDs → idempotent
  const batch = db.batch();

  const studentRef = db.collection('students').doc('APD21110001');
  batch.set(studentRef, {
    studentId: 'APD21110001', userId: uidByRole.student, name: 'Nguyen Van An',
    programme: 'IELTS Advanced', intake: '2024-09', semester: 3, status: 'active',
    classMode: 'hybrid', attendance: 87, gpa: 3.2, feeBalance: 4500000,
    nextFeeDate: '2026-07-01', referringPartnerId: uidByRole.partner, guardianId: uidByRole.parent,
    createdAt: now,
  }, { merge: true });

  const teacherRef = db.collection('teachers').doc('STAFF-0007');
  batch.set(teacherRef, {
    staffId: 'STAFF-0007', userId: uidByRole.teacher, name: 'Sarah Thompson',
    department: 'English', employmentType: 'full-time', kpiScore: 92, kpiGrade: 'A',
    createdAt: now,
  }, { merge: true });

  const invRef = db.collection('invoices').doc('INV-2026-0001');
  batch.set(invRef, {
    studentId: 'APD21110001', amount: 4500000, currency: 'VND', status: 'unpaid',
    dueDate: '2026-07-01', description: 'Semester 3 tuition', createdAt: now,
  }, { merge: true });

  const commRef = db.collection('commissions').doc('COMM-2026-06-0001');
  batch.set(commRef, {
    partnerId: uidByRole.partner, studentId: 'APD21110001', amount: 1350000, rate: 0.30,
    month: '2026-06', status: 'pending', createdAt: now,
  }, { merge: true });

  const notifRef = db.collection('notifications').doc('NOTIF-seed-0001');
  batch.set(notifRef, {
    userId: uidByRole.student, type: 'fee', message: 'Semester 3 tuition is due on 2026-07-01.',
    read: false, createdAt: now,
  }, { merge: true });

  // Classes — taught by the demo teacher
  const classAW = db.collection('classes').doc('CLS-AW-01');
  batch.set(classAW, {
    name: 'Academic Writing', code: 'AW', room: 'B201', schedule: 'Mon 08:00–10:00',
    credits: 3, teacherId: uidByRole.teacher, teacherName: 'Sarah Thompson',
    status: 'active', createdAt: now,
  }, { merge: true });
  const classOC = db.collection('classes').doc('CLS-OC-01');
  batch.set(classOC, {
    name: 'Oral Communication', code: 'OC', room: 'Online', schedule: 'Thu 08:00–10:00',
    credits: 2, teacherId: uidByRole.teacher, teacherName: 'Sarah Thompson',
    status: 'active', createdAt: now,
  }, { merge: true });

  // Enrollments — link the student into both classes
  for (const [cid, cname] of [['CLS-AW-01', 'Academic Writing'], ['CLS-OC-01', 'Oral Communication']]) {
    const eid = `ENR-${cid}-APD21110001`;
    batch.set(db.collection('enrollments').doc(eid), {
      classId: cid, className: cname, studentId: 'APD21110001',
      studentUserId: uidByRole.student, studentName: 'Nguyen Van An',
      guardianId: uidByRole.parent, status: 'active', createdAt: now,
    }, { merge: true });
  }

  // A settled payment example (history) against a prior paid invoice
  batch.set(db.collection('payments').doc('PAY-seed-0001'), {
    invoiceId: 'INV-2026-0001', studentId: 'APD21110001', studentUserId: uidByRole.student,
    guardianId: uidByRole.parent, amount: 4500000, currency: 'VND',
    method: 'momo', status: 'pending', createdAt: now,
  }, { merge: true });

  // Audit log seed (append-only)
  batch.set(db.collection('auditLogs').doc('AUD-seed-0001'), {
    actorUid: uidByRole.admin, action: 'seed.bootstrap',
    detail: 'Initial demo data seeded', createdAt: now,
  }, { merge: true });

  await batch.commit();
  console.log('  ✓ sample students / teachers / classes / enrollments / invoices / payments / commissions / notifications / audit');
}

async function wipeSamples() {
  const ids = [
    ['students', 'APD21110001'], ['teachers', 'STAFF-0007'],
    ['invoices', 'INV-2026-0001'], ['commissions', 'COMM-2026-06-0001'],
    ['notifications', 'NOTIF-seed-0001'],
    ['classes', 'CLS-AW-01'], ['classes', 'CLS-OC-01'],
    ['enrollments', 'ENR-CLS-AW-01-APD21110001'], ['enrollments', 'ENR-CLS-OC-01-APD21110001'],
    ['payments', 'PAY-seed-0001'], ['auditLogs', 'AUD-seed-0001'],
  ];
  for (const [c, id] of ids) { try { await db.collection(c).doc(id).delete(); } catch (_) {} }
  console.log('  ✓ wiped seeded sample docs');
}

(async () => {
  console.log(`\nHP System seeder → project: ${serviceAccount.project_id}`);
  console.log(`Default password: ${PASSWORD}\n`);
  if (WIPE) { console.log('Wiping sample docs…'); await wipeSamples(); }

  console.log('Provisioning users…');
  const uidByRole = {};
  for (const u of USERS) uidByRole[u.role] = await upsertUser(u);

  console.log('\nSeeding sample data…');
  await seedSamples(uidByRole);

  console.log('\n✅ Done. Sign in at your app URL with any address above and the password shown.\n');
  process.exit(0);
})().catch((e) => { console.error('\n✖ Seed failed:', e); process.exit(1); });
