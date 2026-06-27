@echo off
setlocal

echo ================================================
echo HED SYSTEM - Upload to HE-SYSTEM
echo Target: github.com/alvaglow/encent cf- SYSTEM
echo ================================================
echo.

REM Navigate to project
cd /d "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM" 2>nul || (echo ERROR: Cannot find project directory & pause & exit /b 1)

echo Step 1: Preparing repository...

REM Configure git
git config --global user.email "alvic@hed-system.com" 2>nul
git config --global user.name "Alvic" 2>nul

REM Init if needed
if not exist .git git init 2>nul

REM Create .gitignore
echo Step 2: Creating .gitignore...
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
echo .git
) > .gitignore 2>nul

REM Add all files
echo Step 3: Adding all files...
git add -A 2>nul

REM Commit
echo Step 4: Committing files...
git commit -m "Complete HED System - School Management Platform v1.0" --allow-empty 2>nul

REM Setup remote to HE-SYSTEM
echo Step 5: Connecting to HE-SYSTEM repository...
git remote remove origin 2>nul
git remote add origin https://github.com/alvaglow/HE-SYSTEM.git 2>error_log.txt
git branch -M main 2>nul

echo.
echo ================================================
echo READY TO PUSH!
echo ================================================
echo.
echo Repository: https://github.com/alvaglow/HE-SYSTEM
echo.
echo IMPORTANT: You need to create a GitHub Personal Access Token first.
echo.
echo How to get your token:
echo 1. Go to: https://github.com/settings/tokens/new
echo 2. Enter name: HED-System-Upload
echo 3. Check this box: [x] repo
echo 4. Click green [Generate token] button
echo 5. COPY the token immediately (it disappears forever after you leave!)
echo.

set /p token=Enter your Personal Access Token (paste here): 

echo.
echo Pushing to GitHub...
git push https://alvaglow:%token%@github.com/alvaglow/HE-SYSTEM.git main --force

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo SUCCESS! All files uploaded to GitHub!
    echo ================================================
    echo.
    echo Repository: https://github.com/alvaglow/HE-SYSTEM
echo.
    pause
) else (
    echo.
    echo ERROR: Upload failed
echo.
    echo Please check:
    echo 1. Did you create the token correctly? (needs [repo] permission)
    echo 2. Did the repository exist on GitHub? Create it at:
    echo    https://github.com/new
echo 3. Check error above for details
echo.
    type error_log.txt
echo.
    pause
)

endlocal
