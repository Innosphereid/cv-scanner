#!/bin/bash

echo "Setting up Logger for CV Scanner..."

# Install dependencies
echo "Installing winston dependencies..."
npm install winston winston-daily-rotate-file

# Create logs directory
echo "Creating logs directory..."
mkdir -p logs

# Set permissions for logs directory (Unix/Linux)
if [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "darwin"* ]]; then
    chmod 755 logs
    echo "Set permissions for logs directory"
fi

echo "Logger setup completed!"
echo ""
echo "Next steps:"
echo "1. Set NODE_ENV=development for development mode"
echo "2. Set NODE_ENV=production for production mode with file logging"
echo "3. Run 'npm run start:dev' to test the logger"
echo ""
echo "Test endpoints:"
echo "- GET / - Basic logging"
echo "- GET /error - Error logging"
echo "- GET /debug - Debug logging (development only)"
echo "- GET /metadata - Metadata logging"
