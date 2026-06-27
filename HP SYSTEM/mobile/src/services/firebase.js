// services/firebase.js — same Firebase backbone as the web app.
// Uses the Firebase JS SDK (modular) with React Native AsyncStorage persistence,
// so the phone shares one login, one Firestore, and the same Cloud Functions.
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Identical project to HP-SYSTEM.html (web API keys are safe to ship).
const firebaseConfig = {
  apiKey: 'AIzaSyBU5xAG3PazpkOgh74tzqFauB-lH8bvLSs',
  authDomain: 'hp-system-142a5.firebaseapp.com',
  projectId: 'hp-system-142a5',
  storageBucket: 'hp-system-142a5.firebasestorage.app',
  messagingSenderId: '409521475133',
  appId: '1:409521475133:web:6b908b453cffebe369e454',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persist the session across app restarts (so users stay logged in).
let auth;
try {
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch (e) {
  auth = getAuth(app); // already initialized (fast refresh)
}

export const db = getFirestore(app);
export const functions = getFunctions(app);
export { auth };
export default app;
