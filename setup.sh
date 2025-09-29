#!/bin/bash

# HaexHub SDK Setup Script

echo "🚀 Setting up HaexHub SDK..."

# Create directory structure
echo "📁 Creating directory structure..."
mkdir -p src/api
mkdir -p examples

# Initialize git
if [ ! -d .git ]; then
    echo "📦 Initializing git..."
    git init
fi

# Create package.json if it doesn't exist
if [ ! -f package.json ]; then
    echo "📝 Creating package.json..."
    pnpm init -y
fi

# Install dependencies
echo "📥 Installing dependencies..."
pnpm add -D typescript tsup @types/node

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy the TypeScript files to src/"
echo "2. Run 'pnpm build' to build the SDK"
echo "3. Run 'pnpm link' to test locally"
echo "4. Run 'npm publish --access public' to publish"