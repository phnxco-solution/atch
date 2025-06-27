#!/bin/bash

# EncryptedChat Setup Script
echo "🚀 Setting up EncryptedChat application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Function to install dependencies
install_deps() {
    local dir=$1
    echo "📦 Installing dependencies in $dir..."
    cd "$dir"
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies in $dir"
        exit 1
    fi
    cd ..
}

# Install backend dependencies
if [ -d "backend" ]; then
    install_deps "backend"
else
    echo "❌ Backend directory not found"
    exit 1
fi

# Install frontend dependencies
if [ -d "frontend-web" ]; then
    install_deps "frontend-web"
else
    echo "❌ Frontend directory not found"
    exit 1
fi

echo "✅ All dependencies installed successfully!"

# Setup environment files
echo "🔧 Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please edit backend/.env with your database credentials"
fi

if [ ! -f "frontend-web/.env" ]; then
    echo "📝 Creating frontend .env file..."
    cp frontend-web/.env.example frontend-web/.env
fi

echo "✅ Environment files created!"

# Database setup reminder
echo ""
echo "📋 Next steps:"
echo "1. Make sure MariaDB/MySQL is running"
echo "2. Create a database named 'encrypted_chat'"
echo "3. Update backend/.env with your database credentials"
echo "4. Run 'npm run db:migrate' in the backend directory"
echo "5. Start the backend: cd backend && npm run dev"
echo "6. Start the frontend: cd frontend-web && npm run dev"
echo ""
echo "🎉 Setup complete! Check the README.md for detailed instructions."
