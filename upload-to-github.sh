#!/bin/bash
# ──────────────────────────────────────────────────────────────────────────────
# HED SYSTEM — AUTOMATIC GITHUB UPLOAD SCRIPT (Mac/Linux)
# This script will upload ALL your files to GitHub automatically
# RUN: bash upload-to-github.sh
# ──────────────────────────────────────────────────────────────────────────────

set -e  # Exit on error

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║              HED SYSTEM — UPLOAD TO GITHUB AUTOMATICALLY                 ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "This will upload ALL your project files to GitHub."
echo "You need a FREE GitHub account first."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found!"
    echo "Please install: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "⚠️  Git not found. Installing..."
    
    # Detect OS and install git
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install git
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install -y git
    fi
    
    echo "✅ Git installed"
fi

echo ""
echo "✅ Git is ready"

# Step 1: Configure git
echo ""
echo "Step 1: Configure Git..."
git config --global user.email "hed-system@example.com"
git config --global user.name "HED System"
echo "✅ Git configured"

# Step 2: Navigate to project
echo ""
echo "Step 2: Preparing files..."
cd "$HOME/Desktop/HED_SYSTEM" || cd "$HOME/Documents/HED_SYSTEM" || { echo "Could not find project"; exit 1; }
echo "✅ In project directory"

# Step 3: Check if git repo exists
if [ ! -d .git ]; then
    echo ""
    echo "Creating new Git repository..."
    git init
    echo "✅ Git repository created"
else
    echo "✅ Git repository exists"
fi

# Step 4: Create .gitignore
echo ""
echo "Step 3: Creating .gitignore..."
cat > .gitignore << 'EOF'
# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# JWT Keys
keys/
*.pem

# Logs
logs/
*.log

# OS Files
.DS_Store
Thumbs.db

# Build outputs
dist/
build/
.next/
out/

# Vercel
.vercel

# Uploads (user files)
uploads/
EOF
echo "✅ .gitignore created"

# Step 5: Add all files
echo ""
echo "Step 4: Adding all files to Git..."
git add .
git add .gitignore
echo "✅ All files added"

# Step 6: Commit
echo ""
echo "Step 5: Committing files..."
git commit -m "Initial commit: HED System - Complete school management platform"
echo "✅ Files committed"

# Step 7: Check if remote exists
if ! git remote -v > /dev/null 2>&1; then
    echo ""
    echo "🔔 You need to create a GitHub repository first!"
    echo ""
    echo "Please follow these steps:"
    echo "1. Go to: https://github.com/new"
    echo "2. Repository name: hed-system"
    echo "3. Description: HED System - School Management Platform"
    echo "4. Choose: Public (FREE forever)"
    echo "5. Click the green [Create repository] button"
    echo ""
    echo "6. Copy the HTTPS URL (looks like: https://github.com/username/hed-system.git)"
    echo ""
    
    read -p "Enter your GitHub username: " username
    
    git remote add origin "https://github.com/$username/hed-system.git"
    git branch -M main
    
    echo ""
    echo "Pushing files to GitHub..."
    git push -u origin main
else
    echo "✅ GitHub remote already connected"
    git push -u origin main
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo "  ✅ SUCCESS! All files uploaded to GitHub!"
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "Next step: Deploy to Vercel"
echo "1. Go to: https://vercel.comimport"
echo "2. Click [Add New Project]]"
echo "3. Import and select your 'hed-system' repository"
echo "4. Click [Import]]"
echo "5. Click [Deploy]]"
echo ""

read -p "Press Enter to exit..."
