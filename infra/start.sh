#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🦆 Starting The Last of Guss..."
echo ""

cd "$SCRIPT_DIR"

if ! docker ps &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting PostgreSQL..."
docker compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

cd "$REPO_ROOT/backend"

if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/goose?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
PORT=3010
ROUND_DURATION=60
COOLDOWN_DURATION=30
EOF
fi

if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "🧪 Running tests..."
npm run test:run

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "🚀 Starting backend server..."
    npm run dev &
    BACKEND_PID=$!
    
    cd "$REPO_ROOT/frontend"
    
    if [ ! -f ".env" ]; then
        echo "📝 Creating frontend .env file..."
        cat > .env << 'EOF'
VITE_API_URL=http://localhost:3010/api
VITE_WS_URL=ws://localhost:3010/ws
EOF
    fi
    
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm install
    fi
    
    echo "🚀 Starting frontend server..."
    npm run dev &
    FRONTEND_PID=$!
    
    echo ""
    echo "✅ Application started successfully!"
    echo ""
    echo "📍 Backend:  http://localhost:3010"
    echo "📍 Frontend: http://localhost:5173"
    echo ""
    echo "👤 Test users:"
    echo "   - admin (can create rounds)"
    echo "   - Никита (taps don't count)"
    echo "   - Any other name (regular player)"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    trap "echo ''; echo '🛑 Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; cd \"$SCRIPT_DIR\"; docker compose down; exit" INT TERM
    
    wait
else
    echo ""
    echo "❌ Tests failed. Please fix the issues before starting the application."
    exit 1
fi

