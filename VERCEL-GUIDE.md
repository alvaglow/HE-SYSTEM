VERCEL DEPLOYMENT GUIDE
=======================

This guide will help you deploy the HED System to Vercel in 10 simple steps.

---

STEP 1: Create Vercel Account
-----------------------------

1. Go to https://vercel.com
2. Click Sign Up
3. Sign up with GitHub (recommended)
4. Verify your email

---

STEP 2: Create Database
-----------------------

1. In Vercel Dashboard, click Storage tab
2. Click Create Database
3. Select Vercel Postgres
4. Choose Hobby (free) or Pro (paid)
5. Click Create
6. Copy the connection string

---

STEP 3: Create Redis Cache
--------------------------

1. In Vercel Dashboard, click Storage tab
2. Click Create Database
3. Select Vercel KV
4. Choose Hobby (free)
5. Click Create
6. Copy the connection string

---

STEP 4: Install Vercel CLI
--------------------------

Run in Command Prompt:
    npm i -g vercel

Login to Vercel:
    vercel login

---

STEP 5: Set Environment Variables
---------------------------------

In Vercel Dashboard, go to your project settings, then Environment Variables.

DATABASE:
    POSTGRES_URL=your_postgres_url
    REDIS_URL=your_redis_url

AUTHENTICATION:
    JWT_PRIVATE_KEY_PATH=./keys/jwt-private.pem
    JWT_PUBLIC_KEY_PATH=./keys/jwt-public.pem
    JWT_ISSUER=hp-system

ENCRYPTION:
    MASTER_ENCRYPTION_KEY=your_64_char_hex_key
    LIVENESS_SECRET=your_32_char_hex_key

PAYMENT GATEWAYS:
    ZALOPAY_APP_ID=your_app_id
    ZALOPAY_KEY1=your_key1
    ZALOPAY_KEY2=your_key2
    ZALOPAY_CALLBACK_URL=https://yourdomain.vercel.app/api/webhooks/zalopay
    
    VNPAY_TMN_CODE=your_tmn_code
    VNPAY_HASH_SECRET=your_secret
    VNPAY_RETURN_URL=https://yourdomain.vercel.app/api/webhooks/vnpay/return
    
    MOMO_PARTNER_CODE=your_partner_code
    MOMO_ACCESS_KEY=your_access_key
    MOMO_SECRET_KEY=your_secret_key

EMAIL:
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your_email@gmail.com
    SMTP_PASS=your_app_password

APP SETTINGS:
    FRONTEND_URL=https://yourdomain.vercel.app
    CORS_ORIGINS=https://yourdomain.vercel.app
    NODE_ENV=production

---

STEP 6: Generate JWT Keys
---------------------------

Run in Command Prompt:
    cd "HP System/backend"
    node scripts/generate-keys.js

This creates:
    keys/jwt-private.pem (keep secret)
    keys/jwt-public.pem (can be shared)

---

STEP 7: Deploy to Vercel
--------------------------

Run in Command Prompt:
    vercel

When prompted:
    Set up and deploy? Yes
    Project name? hed-system
    Directory? ./

Wait for deployment to complete.

---

STEP 8: Update Webhook URLs
-----------------------------

ZALOPAY:
    1. Log in to sandbox.zalopay.vn
    2. Go to App Settings
    3. Update Callback URL to: https://yourdomain.vercel.app/api/webhooks/zalopay

VNPAY:
    1. Log in to merchant account
    2. Update Return URL to: https://yourdomain.vercel.app/api/webhooks/vnpay/return

MOMO:
    1. Log in to developers.momo.vn
    2. Update IPN URL to: https://yourdomain.vercel.app/api/webhooks/momo

---

STEP 9: Initialize Database
-----------------------------

Visit: https://yourdomain.vercel.app/api/setup

---

STEP 10: Test Your App
----------------------

Frontend: https://yourdomain.vercel.app
API Health: https://yourdomain.vercel.app/api/health

Register a test user, login, and test payments.

---

TROUBLESHOOTING
---------------

Cannot find module:
    Run npm install in both backend and frontend directories

Database connection failed:
    Check POSTGRES_URL environment variable in Vercel Dashboard

Payment webhooks not working:
    Make sure webhook URLs in payment gateway dashboards match your Vercel domain

---

PRICING
-------

Hobby (Free):
    100GB bandwidth per month
    10 second function timeout
    256MB Postgres storage
    Serverless Functions

Pro (20 USD/month):
    1TB bandwidth per month
    60 second function timeout
    Cron compute hours
    Cron jobs
    Priority support

---

You are now live on Vercel!

Deployment guide created: June 2026
