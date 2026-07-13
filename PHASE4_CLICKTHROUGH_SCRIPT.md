# HE-SYSTEM — Manual Click-Through Script

I can't log into the app myself (I never enter passwords/credentials to authenticate, even ones created for testing — that's a fixed rule, not a missing-test-account problem). Everything below is code-verified against the live database, but a real click-through by you is the only way to close out full launch confidence. Should take about 15 minutes.

## Priority checks (these map to bugs I just fixed — confirm they actually work)

1. **Log in as admin** (alvicebazilmushi@gmail.com) → Admin > Users > create a **parent** account and a **management** account. Confirm both save without error.
2. **Admin > Users > Support Staff** → create one. This used to fail every time (enum bug) — confirm it now succeeds.
3. **Admin > KPI** → confirm you see institution-wide data, not just your own row.
4. **Log in as the new parent account** → Dashboard should show the linked child (you'll need to link the child via Admin first if there's no `parent_student_links` row yet — Admin > Students > (child) > Link Parent, if that page exists, otherwise ask me and I'll add it). Confirm Attendance/Fees/Results/Messages all show real data, not "no children linked."
5. **Log in as partner** (or create one via the public /register page) → Payouts > Request a Payout. This used to fail with a database error every time — confirm it now succeeds.
6. **Log in as teacher/student** → Timetable → find or create a class with type "remote" → confirm it now shows "Online" + a working Join Link button (this was broken, comparing against the wrong value).
7. **Management > Finance** → find an expense marked "paid" → confirm it shows a blue badge, not the default gray.

## Standard pass (click every nav item once per role, confirm no crashes/blank pages)

- **Admin**: Dashboard, Users, Students, Teachers, Classes, Leave, Payouts, KPI, Reports
- **Management**: Dashboard, Finance, Leave, Payouts, KPI, Reports
- **Teacher**: Dashboard, Attendance, Timetable, Students, Grades, My KPI, Leave, Messages, Announcements
- **Student**: Dashboard, Attendance & Check-In, Timetable, Results, Fees, Wallet, Location, Messages, Announcements
- **Parent**: Dashboard, Attendance, Results, Fees, Location, Messages, Announcements
- **Partner**: Dashboard, Payouts, Leaderboard (or equivalent)

## If anything breaks

Tell me the exact page, role, and what you saw (error message or wrong data) — I can fix it immediately without needing to log in myself, since I can read the code and the live database directly.
