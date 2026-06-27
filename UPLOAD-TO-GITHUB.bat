@echo off
chcp 65001 >nul
echo.
echo  HED SYSTEM - UPLOAD TO GITHUB AUTOMATICALLY
echo  This will upload ALL your project files to GitHub.
echo  You need a FREE GitHub account first.
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install: C:\Users\alvic\Downloads\node-installer.msi
    pause
    exit /b 1
)

echo OK: Node.js found
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Git not found. Please install from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo OK: Git is ready
echo.

REM Step 1: Configure Git
echo Step 1: Configure Git...
git config --global user.email "hed-system@example.com"
git config --global user.name "HED System"
echo OK: Git configured
echo.

REM Step 2: Navigate to project
echo Step 2: Preparing files...
cd /d "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM"
echo OK: In project directory
echo.

REM Step 3: Check if git repo exists
if exist .git (
    echo OK: Git repository exists
) else (
    echo Creating new Git repository...
    git init
    echo OK: Git repository created
)

REM Step 4: Create .gitignore
echo.
echo Step 4: Creating .gitignore...
(
echo # Node.js
echo node_modules/
echo npm-debug.log*
echo yarn-debug.log*
echo yarn-error.log*
echo.
echo # Environment variables
echo .env
echo .env.local
echo .env.development.local
echo .env.test.local
echo .env.production.local
echo.
echo # JWT Keys
echo keys/
echo *.pem
echo.
echo # Logs
echo logs/
echo *.log
echo.
echo # OS Files
echo .DS_Store
echo Thumbs.db
echo.
echo # Build outputs
echo dist/
echo build/
echo .next/
echo out/
echo.
echo # Vercel
echo .vercel
echo.
echo # Uploads
echo uploads/
) > .gitignore
echo OK: .gitignore created
echo.

REM Step 5: Add all files
echo Step 5: Adding all files to Git...
git add .
git add .gitignore
echo OK: All files added
echo.

REM Step 6: Commit
echo Step 6: Committing files...
git commit -m "Initial commit: HED System"
echo OK: Files committed
echo.

REM Step 7: Check if remote exists
git remote -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo IMPORTANT: You need to create a GitHub repository first
echo.
    echo Please follow these steps:
    echo 1. Go to: https://github.com/new
    echo 2. Repository name: hed-system
    echo 3. Choose: Public (FREE)
    echo 4. Click the green [Create repository] button
    echo.
    echo Then press any key to continue...
    pause >nul
    
    echo.
    set /p username=Enter your GitHub username: 
    
    echo Connecting to GitHub...
    git remote add origin https://github.com/%username%/hed-system.git
    git branch -M main
    git push -u origin main
) else (
    echo OK: GitHub remote already connected
    git push -u origin main
)

echo.
echo SUCCESS! All files uploaded to GitHub!
echo.

pause
