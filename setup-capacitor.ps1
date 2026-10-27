# Capacitor Setup Script for OppositeLab
# Run this script to install Capacitor dependencies

Write-Host "Installing Capacitor dependencies..." -ForegroundColor Green

# Install Capacitor CLI and core packages
npm install @capacitor/core @capacitor/cli --save-dev

# Install platform-specific packages
npm install @capacitor/ios @capacitor/android --save

Write-Host "Capacitor packages installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npx cap init" -ForegroundColor Cyan
Write-Host "2. Build your app: npm run build:capacitor" -ForegroundColor Cyan
Write-Host "3. Add platforms: npx cap add ios && npx cap add android" -ForegroundColor Cyan
Write-Host "4. Sync code: npm run sync:capacitor" -ForegroundColor Cyan
