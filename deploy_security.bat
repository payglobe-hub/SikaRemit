@echo off
REM FREE SIKAREMIT SECURITY DEPLOYMENT SCRIPT

echo SIKAREMIT FREE SECURITY DEPLOYMENT
echo ==================================

REM Check if .env.production exists
if not exist ".env.production" (
    echo ERROR: .env.production not found. Run: python generate_secure_key.py
    exit /b 1
)

REM Backup current .env if it exists
if exist ".env" (
    echo Backing up current .env to .env.backup
    copy .env .env.backup
)

REM Copy production environment
echo Deploying production configuration...
copy .env.production .env

REM Set production environment
set ENVIRONMENT=production

REM Test security configuration
echo Testing security configuration...
python test_security_free.py

echo.
echo DEPLOYMENT COMPLETED
echo Check your security score above
echo Expected improvement: 2.4/10 - 7.5/10
echo.
echo NEXT STEPS:
echo 1. Update actual credentials in .env
echo 2. Restart your application
echo 3. Test all functionality
echo 4. Monitor security logs

pause
