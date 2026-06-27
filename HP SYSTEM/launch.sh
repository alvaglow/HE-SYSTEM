#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# HP SYSTEM — AUTOMATIC LAUNCH SCRIPT FOR NON-TECHNICAL USERS
# This script will do everything automatically!
# RUN: bash launch.sh
# ──────────────────────────────────────────────────────────────────────────────

echo "
╔══════════════════════════════════════════════════════════════════════════╗
║                    HED SYSTEM - AUTOMATIC LAUNCHER                     ║
║                     (For Non-Technical Users)                            ║
╚══════════════════════════════════════════════════════════════════════════╝
"

# Color codes for readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Step 1/10: Checking prerequisites...${NC}"
# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found: $(node --version)${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found. Please install Node.js properly.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm found: $(npm --version)${NC}"

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. Database will need to be configured manually.${NC}"
else
    echo -e "${GREEN}✓ PostgreSQL found${NC}"
fi

echo -e "${BLUE}Step 2/10: Generating secure environment configuration...${NC}"
cd "server-config" || exit 1
node generate-env.js
echo -e "${GREEN}✓ Environment file generated${NC}"

echo -e "${YELLOW}IMPORTANT: Please edit the .env file and add your actual credentials:${NC}"
echo -e "  - Database password"
echo -e "  - Payment gateway keys (ZaloPay, VNPay, MoMo)"
echo -e "  - Email SMTP credentials"
echo -e "${YELLOW}Press Enter when ready to continue...${NC}"
read -r

echo -e "${BLUE}Step 3/10: Installing backend dependencies...${NC}"
cd "../backend" || exit 1
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"

echo -e "${BLUE}Step 4/10: Generating JWT keys...${NC}"
mkdir -p keys
if [ ! -f keys/jwt-private.pem ]; then
    openssl genrsa -out keys/jwt-private.pem 4096
    openssl rsa -in keys/jwt-private.pem -pubout -out keys/jwt-public.pem
    echo -e "${GREEN}✓ JWT keys generated${NC}"
else
    echo -e "${GREEN}✓ JWT keys already exist${NC}"
fi

echo -e "${BLUE}Step 5/10: Setting up database...${NC}"
node scripts/setup.js
echo -e "${GREEN}✓ Database setup complete${NC}"

echo -e "${BLUE}Step 6/10: Creating admin user...${NC}"
node scripts/create-admin.js
echo -e "${GREEN}✓ Admin user created${NC}"

echo -e "${BLUE}Step 7/10: Installing frontend dependencies...${NC}"
cd "../../apps/web" || exit 1
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

echo -e "${BLUE}Step 8/10: Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

echo -e "${BLUE}Step 9/10: Starting backend server...${NC}"
cd "../../HP System/backend" || exit 1
npm start &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend server started (PID: $BACKEND_PID)${NC}"

echo -e "${BLUE}Step 10/10: Starting frontend server...${NC}"
cd "../../apps/web" || exit 1
npm run preview &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend server started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  🎉 HED SYSTEM IS NOW RUNNING!                            ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}Backend API:${NC}   http://localhost:4000"
echo -e "  ${BLUE}Frontend:${NC}     http://localhost:5173"
echo -e "  ${BLUE}API Docs:${NC}     http://localhost:4000/api-docs"
echo ""
echo -e "  ${YELLOW}Default Login:${NC}"
echo -e "    Email:    admin@example.com"
echo -e "    Password: (the one you created in step 6)"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop both servers${NC}"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
