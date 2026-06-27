@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

echo.
echo  ================================================
echo  HED SYSTEM - Upload to GitHub: alvaglow
echo  ================================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Git not found!
    echo Please install from: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Step 1: Configure Git...
git config --global user.email "hed-system@example.com"
git config --global user.name "HED System"
echo OK
echo.

echo Step 2: Navigate to project...
cd /d "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM"
echo OK: In project directory
echo.

echo Step 3: Initialize Git repository (if not exists)...
if not exist .git (
    git init
    echo OK: Repository initialized
) else (
    echo OK: Repository already exists
)
echo.

echo Step 4: Create .gitignore...
(
echo node_modules/
echo .env
echo .env.local
echo keys/
echo *.pem
echo logs/
echo .DS_Store
echo Thumbs.db
echo dist/
echo build/
echo .next/
echo out/
echo .vercel
echo uploads/
) > .gitignore
echo OK: .gitignore created
echo.

echo Step 5: Add all files to Git...
git add .
git add .gitignore
echo OK: All files added
echo.

echo Step 6: Commit files...
git commit -m "Initial commit: Complete HED System platform" 2>nul || echo No changes to commit
echo OK
echo.

echo Step 7: Connect to GitHub (alvaglow/hed-system)...
git remote remove origin 2>nul
git remote add origin https://github.com/alvaglow/hed-system.git
git branch -M main
echo OK: Connected to GitHub
echo.

echo Step 8: Push to GitHub...
echo IMPORTANT: You will be asked for your GitHub credentials.
echo.
echo Username: Your GitHub username (alvaglow)
echo Password: Use a Personal Access Token, NOT your password!
echo.
echo To create a token:
echo 1. Go to: https://github.com/settings/tokens
echo 2. Click [Generate new token] (classic)
echo 3. Name: HED System Upload
echo 4. Check [repo] checkbox
echo 5. Click [Generate token]
echo 6. Copy the token and paste it when asked
echo.
pause

git push -u origin main

echo.
echo ================================================
echo DONE! Files uploaded to GitHub
echo ================================================
echo.
echo Your repository:
echo https://github.com/alvaglow/hed-system
echo.

pause
