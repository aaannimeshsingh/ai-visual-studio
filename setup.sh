#!/bin/bash

echo "🎬 AI Video Studio - Setup Script"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found"
    echo "Please run this script from the ai-video-studio directory"
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/python-ai
mkdir -p backend/typescript-api/src
mkdir -p frontend
mkdir -p shared-storage/uploads
mkdir -p shared-storage/outputs

echo "✅ Directories created"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating template..."
    cat > .env << EOL
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Python AI Service
PYTHON_AI_URL=http://python-ai:8000

# TypeScript API
PORT=3001
EOL
    echo "✅ .env template created"
    echo "❗ IMPORTANT: Edit .env file with your Supabase credentials"
    echo ""
fi

# Check if Supabase credentials are configured
if grep -q "your_supabase_url_here" .env; then
    echo "⚠️  WARNING: Supabase credentials not configured in .env"
    echo ""
    echo "To get your Supabase credentials:"
    echo "1. Go to https://supabase.com"
    echo "2. Create a new project (or use existing)"
    echo "3. Go to Settings > API"
    echo "4. Copy 'Project URL' and 'anon public' key"
    echo "5. Update the .env file with these values"
    echo ""
    read -p "Press Enter when you've updated .env (or Ctrl+C to exit)..."
fi

# Create TypeScript API directory if needed
if [ ! -d "backend/typescript-api/src" ]; then
    mkdir -p backend/typescript-api/src
fi

echo "🔍 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not running"
    echo "Please install Docker Desktop from https://www.docker.com/products/docker-desktop/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Docker daemon is not running"
    echo "Please start Docker Desktop"
    exit 1
fi

echo "✅ Docker is running"
echo ""

echo "🏗️  Building Docker containers..."
echo "⏳ This might take 5-10 minutes on first run (downloading ML models)..."
echo ""

docker-compose build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "🚀 Starting services..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo ""
    echo "=================================="
    echo "✅ AI Video Studio is running!"
    echo "=================================="
    echo ""
    echo "🌐 Access your services:"
    echo "   - Python AI Service: http://localhost:8000"
    echo "   - Python AI Docs: http://localhost:8000/docs"
    echo "   - TypeScript API: http://localhost:3001"
    echo "   - Frontend: http://localhost:3000 (when created)"
    echo ""
    echo "📊 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Stop services:"
    echo "   docker-compose down"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Set up Supabase database (run supabase-setup.sql)"
    echo "   2. Test the API endpoints"
    echo "   3. Build the frontend"
    echo ""
else
    echo ""
    echo "❌ Build failed!"
    echo "Check the error messages above"
    exit 1
fi