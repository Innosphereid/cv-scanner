@echo off
echo Setting up Logger for CV Scanner...

REM Install dependencies
echo Installing winston dependencies...
npm install winston winston-daily-rotate-file

REM Create logs directory
echo Creating logs directory...
if not exist "logs" mkdir logs

echo Logger setup completed!
echo.
echo Next steps:
echo 1. Set NODE_ENV=development for development mode
echo 2. Set NODE_ENV=production for production mode with file logging
echo 3. Run 'npm run start:dev' to test the logger
echo.
echo Test endpoints:
echo - GET / - Basic logging
echo - GET /error - Error logging
echo - GET /debug - Debug logging (development only)
echo - GET /metadata - Metadata logging

pause
