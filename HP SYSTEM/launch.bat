@echo off
REM ─────────────────────────────────────────────────────────────────────────────
REM HP SYSTEM — AUTOMATIC LAUNCH SCRIPT FOR WINDOWS (Non-Technical Users)
REM This script will do everything automatically!
REM RUN: double-click launch.bat
REM ─────────────────────────────────────────────────────────────────────────────

echo.
echo  ╔══════════════════════════════════════════════════════════════════════════╗
echo  ║                    HED SYSTEM - AUTOMATIC LAUNCHER                       ║
echo  ║                     (For Non-Technical Users)                              ║
echo  ╚══════════════════════════════════════════════════════════════════════════╝
echo.

REM Color codes for readability
set "RED=[31m"
set "GREEN=[32m"
set "YELLOW=[33m"
set "BLUE=[34m"
set "NC=[0m"

echo [34mStep 1/10: Checking prerequisites...[0m

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [31m❌ Node.js not found. Please install from https://nodejs.org[0m
    pause
    exit /b 1
)
echo [32m✓ Node.js found[0m

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [31m❌ npm not found. Please install Node.js properly.[0m
    pause
    exit /b 1
)
echo [32m✓ npm found[0m

echo [34mStep 2/10: Generating secure environment configuration...[0m
cd "server-config" || exit /b 1
node generate-env.js
echo [32m✓ Environment file generated[0m

echo [33mIMPORTANT: Please edit the .env file and add your actual credentials:[0m
echo   - Database password
echo   - Payment gateway keys (ZaloPay, VNPay, MoMo)
echo   - Email SMTP credentials
echo [33mPress any key when ready to continue...[0m
pause >nul

echo [34mStep 3/10: Installing backend dependencies...[0m
cd "..\backend" || exit /b 1
npm install
echo [32m✓ Backend dependencies installed[0m

echo [34mStep 4/10: Generating JWT keys...[0m
if not exist keys mkdir keys
if not exist keys\jwt-private.pem (
    echo Generating JWT keys... This may take a moment.
    REM On Windows, we need to handle OpenSSL differently
    REM For now, we'll create a simple script to generate keys
    node -e "const crypto = require('crypto'); const fs = require('fs'); const { generateKeyPairSync } = require('crypto'); const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 4096, publicKeyEncoding: { type: 'pkcs1', format: 'pem' }, privateKeyEncoding: { type: 'pkcs1', format: 'pem' } }); fs.writeFileSync('keys/jwt-private.pem', privateKey); fs.writeFileSync('keys/jwt-public.pem', publicKey); console.log('Keys generated');"
    echo [32m✓ JWT keys generated[0m
) else (
    echo [32m✓ JWT keys already exist[0m
)

echo [34mStep 5/10: Setting up database...[0m
node scripts/setup.js
echo [32m✓ Database setup complete[0m

echo [34mStep 6/10: Creating admin user...[0m
node scripts/create-admin.js
echo [32m✓ Admin user created[0m

echo [34mStep 7/10: Installing frontend dependencies...[0m
cd "..\..\apps\web" || exit /b 1
npm install
echo [32m✓ Frontend dependencies installed[0m

echo [34mStep 8/10: Building frontend...[0m
npm run build
echo [32m✓ Frontend built[0m

echo [34mStep 9/10: Starting backend server...[0m
start "Backend Server" cmd /c "cd /d %~dp0HP System\backend && npm start"
echo [32m✓ Backend server started[0m

timeout /t 3 /nobreak >nul

echo [34mStep 10/10: Starting frontend server...[0m
start "Frontend Server" cmd /c "cd /d %~dp0apps\web && npm run preview"
echo [32m✓ Frontend server started[0m

echo.
echo [32m══════════════════════════════════════════════════════════[0m
echo [32m  🎉 HED SYSTEM IS NOW RUNNING!                            [0m
echo [32m══════════════════════════════════════════════════════════[0m
echo.
echo   [34mBackend API:[0m   http://localhost:4000
echo   [34mFrontend:[0m     http://localhost:5173
echo   [34mAPI Docs:[0m     http://localhost:4000/api-docs
echo.
echo   [33mDefault Login:[0m
echo     Email:    admin@example.com
echo     Password: (the one you created in step 6)
echo.
echo [33mPress any key to stop both servers[0m
pause >nul

REM Kill the node processes (simple approach for demo)
taskkill /FI "WINDOWTITLE eq Backend Server" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Frontend Server" /F >nul 2>&1

echo [32mServers stopped. Have a nice day![0m
pause
