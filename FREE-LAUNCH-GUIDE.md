FREE VERSION LAUNCH GUIDE
=========================

This guide walks you through launching the HED System completely FREE.
No credit card required. No monthly fees.

---

WHAT YOU GET FOR FREE
--------------------

Vercel (Hosting Platform):
   - FREE website hosting (yourname.vercel.app)
   - FREE SSL certificate (HTTPS automatically)
   - FREE global CDN (fast worldwide)
   - 100 GB bandwidth per month
   - Serverless functions (API endpoints)

Vercel Postgres (Database):
   - FREE PostgreSQL database
   - 256 MB storage (enough for 1,000+ users)
   - Automatic backups
   - No setup required

Vercel KV (Cache/Redis):
   - FREE Redis-like cache
   - For rate limiting and sessions

ZaloPay Sandbox:
   - FREE test payments
   - No real money involved
   - Perfect for testing

VNPay Sandbox:
   - FREE test payments
   - No real money involved
   - Perfect for testing

MoMo Sandbox:
   - FREE test payments
   - No real money involved
   - Perfect for testing

Gmail SMTP:
   - FREE email sending
   - 500 emails per day limit
   - Uses your Gmail account

Firebase (Push Notifications):
   - FREE tier (1 million notifications per month)
   - Push notifications to mobile apps

Total Monthly Cost: $0.00

---

BEFORE YOU START
----------------

You need:
   1. A computer with Windows, Mac, or Linux
   2. Node.js installed (see below)
   3. A GitHub account (free)
   4. A Gmail account (for email)

Estimated Time: 30-45 minutes total
Difficulty: Easy (just follow steps carefully)

---

STEP 1: INSTALL NODE.JS (5 minutes)
------------------------------------

Node.js is the engine that runs your system.

Option A: Using the file I already downloaded for you:
   1. Open your Downloads folder
   2. Find: node-installer.msi
   3. Double-click it
   4. Click Next, Next, Next, Finish
   5. Restart your computer

Option B: Download fresh:
   1. Go to: https://nodejs.org
   2. Click the big green LTS button
   3. When download finishes, double-click the file
   4. Click Next, Next, Next, Finish
   5. Restart your computer

Verify installation:
   1. Click Windows key
   2. Type cmd
   3. Press Enter
   4. Type: node --version
   5. You should see a number like: v20.15.1

---

STEP 2: CREATE FREE ACCOUNTS (10 minutes)
------------------------------------------

Account 1: GitHub (Required for Vercel)
   1. Go to: https://github.com
   2. Click Sign Up (top right)
   3. Enter your email
   4. Create a password
   5. Choose a username
   6. Click Continue
   7. Verify your email
   Done!

Account 2: Vercel (Hosting Platform)
   1. Go to: https://vercel.com
   2. Click Sign Up (top right)
   3. Choose Continue with GitHub
   4. Authorize Vercel to access your GitHub
   5. Done! You are now in VLike Vercel dashboard.

Account 3: Gmail (For Email)
   1. You already have Gmail (probably)
   2. If not, go to: https://gmail.com
   3. Click Create Account
   4. Fill in details
   5. Done!

Account 4: ZaloPay Sandbox
   1. Go to: https://sandbox.zalopay.vn
   2. Click Sign Up
   3. Fill in business details (can be fake for sandbox)
   4. Done! (You will get test App ID)

Account 5: VNPay Sandbox
   1. Go to: https://sandbox.vnpayment.vn
   2. Click Sign Up
   3. Fill in details
   4. Done! (You will get test TMN Code)

Account 6: MoMo Sandbox
   1. Go to: https://developers.momo.vn
   2. Click Sign Up
   3. Fill in details
   4. Done! (You will get test Partner Code)

---

STEP 3: CREATE A GITHUB REPOSITORY (5 minutes)
-----------------------------------------------

You need to upload your code to GitHub so Vercel can find it.

   1. Go to: https://github.com/new
   2. Repository name: hed-system
   3. Description: HED System - School Management Platform
   4. Choose Public (FREE) or Private (also FREE now)
   5. Leave other settings as default
   6. Click Create Repository
   7. You will see instructions on how to upload

Upload your code (in the same Command Prompt window):
   8. Click Windows key, type cmd, press Enter
   9. Type these commands one by one:

      cd "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM"
      git init
      git add .
      git commit -m "Initial commit"
      git branch -M main
      git remote add origin https://github.com/YOUR_USERNAME/hed-system.git
      git push -u origin main

   (Replace YOUR_USERNAME with your actual GitHub username)

   10. Refresh the GitHub page, you should see your files
   Done!

---

STEP 4: CREATE FREE DATABASE ON VERCEL (5 minutes)
-------------------------------------------------

   1. Go to: " dashboard (log in)
   2. Click Storage tab (top of page)
   3. Click Create Database button
   4. Select Vercel Postgres
   5. Name: hed-system-db
   6. Region: Pick closest to you (example: Singapore for Asia)
   7. Plan: Hobby (FREE)
   8. Click Create
   9. Done! Your database is ready.

---

STEP 5: CONNECT YOUR PROJECT TO VERCEL (5 minutes)
----------------------------------------------------

   1. In V " dashboard, click Add New Project
   2. Click Import Git Repository
   3. Find hed-system in the list
   4. Click Import
   5. Framework Preset: Next.js (should be detected automatically)
   6. Click Environment Variables
   7. Add these (use your real values from ZaloPay, etc.):

      NODE_ENV = production
      PORT = 3000
      DATABASE_URL = (copy from the database you created in Step 4)
      
      ZALOPAY_APP_ID = your_test_app_id
      ZALOPAY_KEY1 = your_test_key1
      ZALOPAY_KEY2 = your_test_key2
      ZALOPAY_ENDPOINT = https://sb-openapi.zalopay.vn/v2
      
      VNPAY_TMN_CODE = your_test_tmn_code
      VNPAY_HASH_SECRET = your_test_hash_secret
      
      MOMO_PARTNER_CODE = your_test_partner_code
      Modic_ACCESS_KEY = your_test_access_key
      MOMO_SECRET_KEY = your_test_secret_key
      
      SMTP_HOST = smtp.gmail.com
      SMTP_PORT = 587
      SMTP_USER = your_gmail@gmail.com
      SMTP_PASS = your_gmail_app_password
      
      FRONTEND_URL = https://yourname.vercel.app
      CORS_ORIGINS = https://yourname.vercel.app

   8. Click Deploy
   9. Wait 2-3 minutes for build to complete
   10. Done! You will see a green Congratulations message

Your FREE website is now live at:
   https://hed-system-yourusername.vercel.app

---

STEP 6: CREATE ADMIN USER (3 minutes)
--------------------------------------

Once your site is live:
   1. Go to: https://hed-system-yourusername.vercel.app
   2. Click Register
   3. Fill in:
      Email: your_real_email@example.com
      Password: Choose a strong password
      Role: admin
      Full Name: Your Name
   4. Click Register
   5. You are now logged in as admin
   Done! You can use the system immediately.

---

STEP 7: TEST EVERYTHING (Optional but Recommended)
---------------------------------------------------

Test 1: Create a Test Student
   1. Log in as admin
   2. Go to Students section
   3. Add a new student
   4. Fill in details
   5. Save

Test 2: Create a Test Class
   1. Go to Classes section
   2. Create a new class
   3. Assign student to class
   4. Save

Test 3: Create a Test Payment
   1. Go to Payments section
   2. Create an invoice for the student
   3. Click Pay
   4. Choose ZaloPay (sandbox)
   5. Complete test payment
   6. Check payment status

Test 4: Check-in Attendance
   1. Go to Attendance section
   2. Open a check-in session
   3. Use test GPS coordinates near your school
   4. Complete check-in
   5. Verify it appears in records

---

WHAT YOU CAN DO WITH THE FREE VERSION
-------------------------------------

Educational Institutions:
   - Manage up to 100 students
   - Track attendance via GPS
   - Generate reports
   - Send notifications to parents
   - Manage classes and schedules

Accounting:
   - Create invoices
   - Accept test payments (sandbox)
   - Generate PDF receipts
   - Track payment history

Administration:
   - Role-based access (admin, teacher, parent, student)
   - Secure login with 2FA
   - Audit logs
   - Audit trail

Mobile:
   - Push notifications
   - Offline mode
   - Biometric login
   - GPS check-in

---

WHAT YOU CANNOT DO WITH THE FREE VERSION
-----------------------------------------

1. Real Money Payments
   - Sandbox only (test money)
   - To accept real payments, upgrade to production API keys
   - Cost: Contact payment gateways for pricing

2. Custom Domain
   - You get yourname.vercel.app
   - To use www.yourname.com, buy a domain ($10-15/year)

3. Advanced Support
   - Community support only
   - For priority support: $20/month on Vercel Pro

4. More Storage
   - 256 MB database limit
   - For more: $5/month on Vercel Pro

---

WHEN TO UPGRADE
---------------

Upgrade to PAID when:
   - You have more than 100 active users
   - Your database grows beyond 256 MB
   - You need real payment processing
   - You want a custom domain
   - You need priority support
   - You need more than 100 GB bandwidth per month

Typical timeline:
   - Month 1-3: FREE version (testing)
   - Month 4-6: Vercel Pro ($20/month)
   - Month 7+: Paid as you grow

---

COST COMPARISON
---------------

Set Up Free:
   - Vercel Hosting: $0
   - Vercel Database: $0
   - Vercel Cache: $0
   - Domain: $0 (uses .vercel.app)
   - SSL: $0 (automatic)
   - Payment Testing: $0 (sandbox)
   - Email: $0 (Gmail app password)
   Total: $0.00 per month

Upgrade to Paid Later:
   - Vercel Pro: $20/month
   - Custom Domain: $10/year
   - Real Payment Processing: Contact gateway
   Total: ~$30/month initially

---

IMPORTANT NOTES
---------------

Data Safety:
   - Your database is backed up automatically by Vercel
   - But you should still export data weekly
   - Go to Vercel Storage -> Database -> Backups

Email Limits:
   - Gmail SMTP: 500 emails per day
   - If you need more, use SendGrid (100/day free) or Mailgun

Payment Testing:
   - Sandbox environment is FREE but shows test data
   - Real students/parents cannot use test payments
   - When ready, upgrade to production API keys

Performance:
   - FREE tier is fast for 0-100 users
   - May slow down with 100+ concurrent users
   - Upgrade to Pro for better performance

---

TROUBLESHOOTING
---------------

Problem: Build fails on Vercel
Solution: Check error logs in Vercel dashboard -> Deployments

Problem: Database connection error
Solution: Check DATABASE_URL in Vercel Environment Variables

Problem: Cannot login
Solution: Make sure database is created and schema.sql ran successfully

Problem: Payments not working
Solution: Use sandbox values, not production. Check payment gateway dashboard.

Problem: Emails not sending
Solution: Use Gmail App Password (not your regular Google password)

Problem: Site is slow
Solution: Normal for free tier. Upgrade to Pro for better performance.

---

SUPPORT RESOURCES
-----------------

Free Support:
   - Vercel Documentation: https://vercel.com/docs
   - GitHub Community: https://github.community
   - Stack Overflow: https://stackoverflow.com
   - Project Documentation: Read the files in your HED_SYSTEM folder

Premium Support (if needed later):
   - Vercel Pro: $20/month for priority support
   - Hire developer on Upwork: $50-100/hour

---

YOU ARE READY TO LAUNCH FREE!
-----------------------------

Just follow the 7 steps above:
   1. Install Node.js
   2. Create free accounts
   3. Create GitHub repository
   4. Create free database on Vercel
   5. Connect project to Vercel
   6. Create admin user
   7. Test everything

Total Cost: $0.00
Time Required: 30-45 minutes
Technical Level: Beginner-friendly

---

Good luck with your FREE launch!

Created by: Your AI Assistant
Date: June 27, 2026
