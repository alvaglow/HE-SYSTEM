@echo off
echo.
echo  ╔══════════════════════════════════════════════════════════════════════════╗
echo  ║                    ONE-CLICK UPLOAD TO GITHUB                              ║
echo  ║                    Repository: alvaglow/HE-SYSTEM                          ║
echo  ╚══════════════════════════════════════════════════════════════════════════╝
echo.

cd /d "C:\Users\alvic\OneDrive\Desktop\HED_SYSTEM"

echo Preparing files...
git config --global user.email "alvic@hed-system.com" 2>nul
git config --global user.name "Alvic" 2>nul

if not exist .git git init 2>nul

git add -A 2>nul
git commit -m "HED System v1.0 - Complete school management platform" --allow-empty 2>nul

git remote remove origin 2>nul
git remote add origin https://github.com/alvaglow/HE-SYSTEM.git 2>nul
git branch -M main 2>nul

echo.
echo ================================================
echo IMPORTANT: You need to create a GitHub Token
echo ================================================
echo.
echo Step 1: Open this link in your browser:
echo         https://github.com/settings/tokens/new
echo.
echo Step 2: Enter this name: HED-System-Upload
echo.
echo Step 3: Check ONLY this box: [x] repo
echo.
echo Step 4: Click GREEN button: [Generate token]
echo.
echo Step 5: COPY the long code that appears
echo         (looks like: ghp_xxxxxxxxxxxxxxxxxxxxxx)
echo.
echo Step 6: Paste it below and press Enter
echo.

set /p TOKEN=Paste your token here: 

echo.
echo Uploading files... Please wait...
git push https://alvaglow:%TOKEN%@github.com/alvaglow/HE-SYSTEM.git main --force

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo SUCCESS! Everything uploaded to GitHub!
    echo ================================================
    echo.
    echo View your files here:
    echo https://github.com/alvaglow/HE-SYSTEM
echo.
    pause
) else (
    echo.
    echo ERROR: Upload failed!
    echo.
    echo Possible reasons:
    echo 1. Token missing [repo] permission
echo 2. Repo doesn't exist on GitHub yet
    echo 3. Wrong token copied
echo.
    echo To fix: Create repository first:
    echo https://github.com/new
echo Name: HE-SYSTEM
echo.
    pause
)
