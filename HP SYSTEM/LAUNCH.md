# HP System — Launch Guide

## Step 1 — Create Firebase Project (5 min)

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it `hp-system` (or your preferred name)
3. Disable Google Analytics (optional) → **Create project**

---

## Step 2 — Enable Authentication

1. In the Firebase console → **Authentication** → **Get started**
2. Enable **Email/Password** provider
3. Enable **Google** provider (add your support email)

---

## Step 3 — Create Firestore Database

1. **Firestore Database** → **Create database**
2. Choose **Production mode** (rules are already written in `firestore.rules`)
3. Select a region close to your users (e.g. `asia-southeast1` for Vietnam)

---

## Step 4 — Get Your Firebase Config

1. **Project Settings** (gear icon) → **General** → scroll to **Your apps**
2. Click **Add app** → Web (`</>`)
3. Register app as `HP System` → copy the config object

---

## Step 5 — Paste Config into HP-SYSTEM.html

Open `HP-SYSTEM.html` and replace the placeholder block (around line 214):

```javascript
var HP_FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",        // ← paste your values here
  authDomain:        "hp-system.firebaseapp.com",
  projectId:         "hp-system",
  storageBucket:     "hp-system.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123:web:abc123"
};
```

> Once `apiKey` is no longer `"YOUR_API_KEY"`, `DEMO_MODE` turns off automatically
> and the app uses real Firebase Auth + Firestore.

---

## Step 6 — Deploy Firestore Rules & Indexes

Install Firebase CLI (once):
```bash
npm install -g firebase-tools
firebase login
```

From the `HP SYSTEM` folder:
```bash
cd "C:\Users\alvic\OneDrive\Desktop\HP SYSTEM"
firebase use --add          # select your project, alias 'default'
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Step 7 — Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be live at:  
`https://YOUR_PROJECT_ID.web.app`

---

## Step 8 — Create the First Admin User

1. Open your live app URL
2. Click **Sign In** → use `admin@yourdomain.com` and a secure password
3. In Firebase Console → **Firestore** → create a document:
   - Collection: `users`  
   - Document ID: _(the UID from Authentication tab)_  
   - Fields: `role: "admin"`, `name: "Your Name"`, `email: "admin@yourdomain.com"`

This gives the first admin access. From there, use the Admin portal to enrol students and assign other roles.

---

## Demo Mode (no Firebase needed)

Open `HP-SYSTEM.html` directly in a browser — no server needed.  
Use the role cards on the login screen to explore any portal instantly.

---

## Files Reference

| File | Purpose |
|------|---------|
| `HP-SYSTEM.html` | Complete single-file application |
| `firebase.json` | Hosting + Firestore config |
| `firestore.rules` | RBAC security rules (all 6 roles) |
| `firestore.indexes.json` | Composite query indexes |
| `.firebaserc` | Firebase project alias (edit with your project ID) |

---

## Portals Summary

| Role | Login (demo) | Key Features |
|------|-------------|-------------|
| Student | `student@hp.edu` | Dashboard, timetable, results, attendance, fees |
| Teacher | `teacher@hp.edu` | Grade entry, OTP attendance, leave management |
| Admin | `admin@hp.edu` | Student enrolment wizard, staff, invoices |
| Management | `management@hp.edu` | KPI board, revenue chart, P&L finance |
| Partner | `partner@hp.edu` | Commission tracking, leaderboard, tier |
| Parent | `parent@hp.edu` | Child profile, results, fee alerts |

