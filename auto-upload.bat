@echo off
setlocal

echo ================================================
echo HED SYSTEM - Automatic GitHub Upload
echo Target: github.com/alvaglow/hed-system
echo ================================================
echo.

REM Check prerequisite
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo Git not found. Installing now...
    bitsadmin /transfer gitdl "https://github.com/git-for-windows/git/releases/download/v2.45.2.windows.1/Git-2.45.2-64-bit.exe" "%TEMP%\git-installer.exe" >nul
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART
    set "PATH=%PATH%;C:\Program Files\Git\cmd"
)

cd /d "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM" 2>nul || (echo Cannot find project directory & exit /b 1)

REM Configure git
git config --global user.email "system@hed.edu.vn" 2>nul
git config --global user.name "HED System" 2>nul

REM Init repo if needed
if not exist .git git init 2>nul

REM Create .gitignore
echo Creating .gitignore...
(
echo node_modules/
echo .env
echo .env.*
echo keys/
echo *.pem
echo dist/
echo build/
echo .next/
echo out/
echo .vercel
echo uploads/
echo *.log
echo logs/
echo .DS_Store
) > .gitignore 2>nul

REM Stage everything
git add -A 2>nul

REM Commit
git commit -m "Initial commit: HED System v1.0" 2>nul

REM Setup remote and push
git remote remove origin 2>nul
git remote add origin https://github.com/alvaglow/hed-system.git 2>nul
git branch -M main 2>nul

echo.
echo Pushing to github.com/alvaglow/hed-system...
echo.
git push -u origin main 2>push_error.txt

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo SUCCESS! All files uploaded to GitHub
cd
    echo ================================================
    echo.
    echo Repository: https://github.com/alvaglow/hed-system
    echo.
    echo Next: Go to https://vercel.com and deploy!
    echo.
) else (
    echo.
    echo ================================================
    echo Upload failed - Authentication needed
    echo ================================================
    echo.
    echo You need to create a GitHub Personal Access Token:
    echo.
    echo 1. Go to: https://github.com/settings/tokens/new
    echo 2. Token name: HED-System-Upload
    echo 3. Check: [x] repo
    echo 4. Click [Generate token]
    echo 5. COPY the token (you will only see it once!)
    echo 6. Run this script again and paste the token when prompted
    echo.
    echo Error details saved to: push_error.txt
    echo.
)

pause
