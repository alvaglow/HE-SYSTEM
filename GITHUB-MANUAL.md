UPLOAD TO GITHUB - MANUAL GUIDE
================================

This guide shows you how to upload your HED System files to GitHub in 7 simple steps.

---

STEP 1: CREATE A GITHUB ACCOUNT (2 minutes)
-------------------------------------------

If you do not have a GitHub account:

1. Open your web browser (Chrome, Edge, Firefox).
2. Go to: https://github.com
3. Click the green button that says [Sign up for GitHub]
4. Enter your email address.
5. Create a password.
6. Choose a username (like: yourname-hed-system).
7. Click [Continue].
8. Go to your email and verify the account.
9. Done! You now have a GitHub account.

---

STEP 2: CREATE A NEW REPOSITORY (1 minute)
------------------------------------------

1. While logged in to GitHub, go to: https://github.com/new
2. Repository name: hed-system
3. Description: HED System - School Management Platform
4. Choose: Public (this is free)
5. Leave the other settings as default.
6. Click the green button that says [Create repository]
7. You will see a page with instructions.
8. Leave this page open. You will need the URL.

The URL looks like this:
https://github.com/YOUR-USERNAME/hed-system.git

Copy this URL to your clipboard (Ctrl+C).

---

STEP 3: OPEN COMMAND PROMPT (30 seconds)
----------------------------------------

1. Click the Windows key on your keyboard.
2. Type cmd
3. Press Enter.
4. A black window opens. This is Command Prompt.

---

STEP 4: INSTALL NODE.JS (if not already installed)
----------------------------------------------------

Skip this step if you already installed Node.js.

1. Go to your Downloads folder.
2. Double-click: node-installer.msi
3. Click Next, Next, Next, Finish.
4. Restart your computer.

---

STEP 5: UPLOAD YOUR FILES (5 minutes)
-------------------------------------

In the Command Prompt window, type these commands one by one.
Press Enter after each command.

1. Type:
   cd "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM"

2. Type:
   git init

3. Type:
   git add .

4. Type:
   git commit -m "Initial commit"

5. Type (replace YOUR-USERNAME with your actual GitHub username):
   git remote add origin https://github.com/YOUR-USERNAME/hed-system.git

6. Type:
   git branch -M main

7. Type:
   git push -u origin main

8. It will ask for your GitHub username and password.
    Username: Type your GitHub username and press Enter.
    Password: For the password, do NOT use your GitHub password.
            Use a "Personal Access Token" instead.
            See instructions in Step 6 below.

---

STEP 6: CREATE A PERSONAL ACCESS TOKEN (2 minutes)
----------------------------------------------------

GitHub no longer allows you to use your regular password. You need a special "token" instead.

1. Go to: https://github.com/settings/tokens
2. Click [Generate new token] (classic).
3. Type a name: HED System Upload
4. Expiration: Select 30 days (or No expiration if you prefer).
5. Under Select scopes, check the box that says [repo]
6. Scroll down and click [Generate token].
7. Copy the token immediately. You will only see it once!
8. This token is now your password when asked.

When the command asks for your password, paste this token instead.

---

STEP 7: VERIFY THE UPLOAD (30 seconds)
--------------------------------------

1. Go back to your GitHub repository page: https://github.com/YOUR-USERNAME/hed-system
2. Refresh the page.
3. You should see all your files listed.
4. Done! Your files are now on GitHub.

---

WHAT TO DO NEXT
---------------

Now that your files are on GitHub, you can deploy to Vercel:

1. Go to: https://vercel.com
2. Sign in with your GitHub account.
3. Click [Add New Project].
4. Find hed-system and click [Import].
5. Click [Deploy].
6. Done! Your website is now live.

See FREE-LAUNCH-GUIDE.md for detailed instructions.

---

TROUBLESHOOTING
---------------

Problem: git is not recognized
Solution: Download and install Git from https://git-scm.com/download/win

Problem: Permission denied
Solution: Make sure you are using a Personal Access Token, not your password.

Problem: fatal: not a git repository
Solution: Make sure you typed the cd command correctly in Step 5.

Problem: fatal: remote origin already exists
Solution: Type: git remote remove origin
         Then try Step 5 again.

---

Good luck!
