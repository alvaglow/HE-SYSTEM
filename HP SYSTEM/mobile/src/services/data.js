// services/data.js — the mobile app's window onto the shared backbone.
// Same Firestore collections + Cloud Functions the web app uses, so a phone
// check-in shows on the teacher's web screen and a phone payment settles the
// same invoice.
import { auth, db, functions } from './firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import {
  doc, getDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import * as Notifications from 'expo-notifications';

// ── Auth ──────────────────────────────────────────────────────
export const signIn = (email, password) =>
  signInWithEmailAndPassword(auth, String(email).trim().toLowerCase(), password);
export const logout = () => signOut(auth);
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const currentUser = () => auth.currentUser;

export const getProfile = async (uid) => {
  try {
    const s = await getDoc(doc(db, 'users', uid));
    return s.exists() ? { uid, ...s.data() } : { uid, role: 'student' };
  } catch (e) { return { uid, role: 'student' }; }
};

// ── Live reads (real-time, shared with web) ──────────────────
export const watchStudentByUser = (uid, cb) =>
  onSnapshot(query(collection(db, 'students'), where('studentUserId', '==', uid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));

export const watchStudentsByGuardian = (uid, cb) =>
  onSnapshot(query(collection(db, 'students'), where('guardianId', '==', uid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));

export const watchInvoices = (studentId, cb) =>
  onSnapshot(query(collection(db, 'invoices'), where('studentId', '==', studentId)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));

export const watchNotifications = (uid, cb) =>
  onSnapshot(query(collection(db, 'notifications'), where('userId', '==', uid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));

export const watchMyAttendance = (uid, cb) =>
  onSnapshot(query(collection(db, 'attendanceRecords'), where('studentId', '==', uid)),
    (s) => cb(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => cb([]));

// ── Attendance check-in — server-verified via the submitCheckIn Function
// (active session + GPS geofence + idempotency; client cannot write the record directly) ──
export const checkInByOtp = async ({ otp, location, livenessToken }) => {
  const fn = httpsCallable(functions, 'submitCheckIn');
  const res = await fn({
    otp: String(otp),
    lat: location ? location.latitude : null,
    lng: location ? location.longitude : null,
    livenessToken: livenessToken || 'mobile-face',
  });
  return res.data;
};

// ── Payments (same Cloud Function as web) ────────────────────
export const startPayment = async (invoiceId, method) => {
  const fn = httpsCallable(functions, 'createPayment');
  const res = await fn({ invoiceId, method });
  return res.data; // { paymentId, method, payUrl, ... }
};

// ── Push notifications (same notifications fabric) ────────────
export const registerPushToken = async (uid, token) => {
  if (!uid || !token) return;
  await setDoc(doc(db, 'users', uid), { pushToken: token, pushUpdatedAt: serverTimestamp() }, { merge: true });
};

export const registerForPush = async (uid) => {
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await registerPushToken(uid, token);
    return token;
  } catch (e) { console.warn('[push] register failed:', e.message); return null; }
};

export default {
  signIn, logout, watchAuth, currentUser, getProfile,
  watchStudentByUser, watchStudentsByGuardian, watchInvoices, watchNotifications, watchMyAttendance,
  checkInByOtp, startPayment, registerForPush,
};
