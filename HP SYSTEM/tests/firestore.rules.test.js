/**
 * Firestore security-rules tests (Stage 4).
 * Run against the emulator:
 *   cd tests && npm install
 *   firebase emulators:exec --only firestore "npm test"
 *
 * Verifies least-privilege access for the key collections, using the role
 * custom-claim model the rules now rely on.
 */
const fs = require('fs');
const path = require('path');
const {
  initializeTestEnvironment, assertSucceeds, assertFails,
} = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection } = require('firebase/firestore');

let testEnv;
const PROJECT = 'hp-system-rules-test';

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
afterAll(async () => { await testEnv.cleanup(); });
beforeEach(async () => { await testEnv.clearFirestore(); });

// helpers: authed context carries the role as a custom claim
const ctx = (uid, role) => testEnv.authenticatedContext(uid, role ? { role } : {}).firestore();
const anon = () => testEnv.unauthenticatedContext().firestore();

// Seed a doc bypassing rules
const seed = (fn) => testEnv.withSecurityRulesDisabled(async (c) => fn(c.firestore()));

describe('users', () => {
  test('owner reads own profile; stranger denied', async () => {
    await seed((db) => setDoc(doc(db, 'users/u1'), { role: 'student', name: 'A' }));
    await assertSucceeds(getDoc(doc(ctx('u1', 'student'), 'users/u1')));
    await assertFails(getDoc(doc(ctx('u2', 'student'), 'users/u1')));
  });
  test('only admin creates users', async () => {
    await assertFails(setDoc(doc(ctx('s', 'student'), 'users/x'), { role: 'student' }));
    await assertSucceeds(setDoc(doc(ctx('a', 'admin'), 'users/x'), { role: 'student', name: 'X' }));
  });
});

describe('students', () => {
  test('student reads own record (studentUserId), not others', async () => {
    await seed((db) => setDoc(doc(db, 'students/APD1'), { studentUserId: 'u1', guardianId: 'p1' }));
    await assertSucceeds(getDoc(doc(ctx('u1', 'student'), 'students/APD1')));
    await assertFails(getDoc(doc(ctx('u9', 'student'), 'students/APD1')));
    await assertSucceeds(getDoc(doc(ctx('p1', 'parent'), 'students/APD1')));
  });
});

describe('attendanceRecords — server-only writes', () => {
  test('client cannot create a check-in directly', async () => {
    await assertFails(addDoc(collection(ctx('u1', 'student'), 'attendanceRecords'),
      { studentId: 'u1', status: 'present' }));
  });
});

describe('payments — server-only', () => {
  test('client cannot create a payment', async () => {
    await assertFails(addDoc(collection(ctx('u1', 'student'), 'payments'), { amount: 1 }));
  });
});

describe('auditLogs — append-only', () => {
  test('signed-in can create; nobody can edit/delete', async () => {
    await assertSucceeds(addDoc(collection(ctx('u1', 'student'), 'auditLogs'),
      { actorUid: 'u1', action: 'x' }));
    await seed((db) => setDoc(doc(db, 'auditLogs/L1'), { actorUid: 'u1', action: 'x' }));
    await assertFails(updateDoc(doc(ctx('a', 'admin'), 'auditLogs/L1'), { action: 'y' }));
    await assertFails(deleteDoc(doc(ctx('a', 'admin'), 'auditLogs/L1')));
  });
});

describe('commissionPayouts — function-written, partner reads own', () => {
  test('partner reads own payout; other partner denied; no client write', async () => {
    await seed((db) => setDoc(doc(db, 'commissionPayouts/p1_2026-06'), { partnerId: 'p1', amount: 100 }));
    await assertSucceeds(getDoc(doc(ctx('p1', 'partner'), 'commissionPayouts/p1_2026-06')));
    await assertFails(getDoc(doc(ctx('p2', 'partner'), 'commissionPayouts/p1_2026-06')));
    await assertFails(setDoc(doc(ctx('p1', 'partner'), 'commissionPayouts/x'), { partnerId: 'p1' }));
  });
});

describe('notifications — own only', () => {
  test('user reads + marks own read', async () => {
    await seed((db) => setDoc(doc(db, 'notifications/n1'), { userId: 'u1', read: false }));
    await assertSucceeds(getDoc(doc(ctx('u1', 'student'), 'notifications/n1')));
    await assertFails(getDoc(doc(ctx('u2', 'student'), 'notifications/n1')));
    await assertSucceeds(updateDoc(doc(ctx('u1', 'student'), 'notifications/n1'), { read: true }));
  });
});
