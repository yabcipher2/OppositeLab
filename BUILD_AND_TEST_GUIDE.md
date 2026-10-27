# 🧪 Build and Test Guide

## Overview

This guide covers building and testing your OppositeLab app for mobile deployment. Follow these steps before submitting to app stores.

---

## 🔧 Build Environment Setup

### 1. Verify Dependencies

```powershell
# Check Node.js version (should be 18+)
node --version

# Check npm version
npm --version

# Verify all dependencies installed
npm install
```

### 2. Verify Platform Setup

```powershell
# Check if platforms exist
Test-Path ios
Test-Path android

# If missing, add them:
# npm run cap:add:ios
# npm run cap:add:android
```

---

## 🌐 Test Web Build First

Always test the web build before mobile builds.

### Build for Web (with API routes):

```powershell
# Clean previous builds
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build for web
npm run build:web

# Test locally
npm start

# Open http://localhost:3000
# Test all features
```

### Verify Web Build:
- [ ] App loads without errors
- [ ] All pages accessible
- [ ] API routes work
- [ ] Video calls function
- [ ] Authentication works
- [ ] No console errors

---

## 📱 Build for Mobile (Static Export)

Mobile apps use static export (no server-side rendering).

### Important: API Routes Won't Work

Mobile builds use `output: 'export'` which doesn't support API routes. Your app needs to:

1. **Call external API** (deployed web version)
2. **Or** use client-side only features

### Set Environment Variables

Create `.env.production.local`:

```bash
CAPACITOR_BUILD=true
NEXT_PUBLIC_API_URL=https://your-deployed-app.vercel.app
MONGODB_URI=your_mongodb_uri
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

### Build for Capacitor:

```powershell
# Set environment variable
$env:CAPACITOR_BUILD = "true"
$env:NEXT_PUBLIC_API_URL = "https://your-deployed-app.vercel.app"

# Clean previous build
Remove-Item -Recurse -Force out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Build static export
npm run build:capacitor

# Verify output directory exists
Test-Path out

# Check files in output
Get-ChildItem out
```

### Verify Build Output:

The `out/` directory should contain:
- [ ] `index.html`
- [ ] `_next/` folder with static files
- [ ] `manifest.json`
- [ ] `sw.js` (service worker)
- [ ] `icons/` folder
- [ ] All page HTML files

**Common Issues:**

1. **Build fails with "Page not found"**
   - Check for dynamic routes that need static generation
   - Verify all API calls use `NEXT_PUBLIC_API_URL`

2. **"Cannot use dynamic routes in static export"**
   - Ensure all dynamic routes use `generateStaticParams`
   - Or use client-side routing only

3. **"API routes not supported"**
   - This is expected - see `CAPACITOR_IMPORTANT.md`
   - Deploy web version separately as API backend

---

## 🤖 Test Android Build

### Prerequisites:

```powershell
# Verify Android Studio installed
# Check JAVA_HOME set
echo $env:JAVA_HOME

# Check Android SDK
# Run: android --version (in Android Studio SDK tools)
```

### Sync to Android:

```powershell
# Sync Capacitor to Android
npm run cap:sync:android

# Check for errors
# Should see: "✔ Copying web assets from out to android\app\src\main\assets\public in ..."
```

### Open in Android Studio:

```powershell
npm run cap:open:android
```

**In Android Studio:**

1. **Wait for Gradle sync** (first time takes 5-10 minutes)
2. **Check for errors** in Messages/Build tabs
3. **Verify WebView assets:**
   - Navigate to `app/src/main/assets/public/`
   - Should see your web files

### Build Debug APK:

```powershell
# In Android Studio:
# Build → Build Bundle(s) / APK(s) → Build APK(s)

# Or command line:
cd android
./gradlew assembleDebug

# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Device/Emulator:

```powershell
# Connect device via USB or start emulator

# Install
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or use Android Studio: Run → Run 'app'
```

### Test on Android:

- [ ] App launches without crash
- [ ] Splash screen shows
- [ ] All screens load
- [ ] Navigation works
- [ ] Camera permission prompt works
- [ ] Microphone permission prompt works
- [ ] Video calls function
- [ ] Back button works properly
- [ ] No crashes during normal use

### Debug Android Issues:

```powershell
# View logs
adb logcat | Select-String "Capacitor"

# Chrome DevTools (inspect WebView):
# 1. Connect device
# 2. Open Chrome: chrome://inspect
# 3. Select your app
# 4. Debug like a web app!
```

---

## 🍎 Test iOS Build (macOS Only)

### Prerequisites:

```bash
# Verify Xcode installed
xcode-select --version

# Verify CocoaPods
pod --version

# If missing:
sudo gem install cocoapods
```

### Sync to iOS:

```bash
# Sync Capacitor to iOS
npm run cap:sync:ios

# Check for errors
# Should see: "✔ Copying web assets from out to ios/App/public in ..."
```

### Open in Xcode:

```bash
npm run cap:open:ios
```

**In Xcode:**

1. **Select Scheme:** Select "App" scheme
2. **Select Device:** Choose simulator or real device
3. **Check Assets:**
   - Navigate to App → public folder
   - Should see your web files

### Build and Run:

```bash
# In Xcode:
# Product → Build (⌘B)
# Wait for build to complete

# Product → Run (⌘R)
# App launches in simulator/device
```

### Test on iOS:

- [ ] App launches without crash
- [ ] Splash screen shows
- [ ] All screens load
- [ ] Navigation works
- [ ] Camera permission prompt works
- [ ] Microphone permission prompt works
- [ ] Video calls function
- [ ] App works in different orientations
- [ ] No crashes during normal use

### Debug iOS Issues:

**In Xcode:**
- View Console: View → Debug Area → Activate Console
- Set breakpoints
- Use Safari Web Inspector for WebView debugging

**Safari Web Inspector:**
1. Connect device via USB
2. Safari → Develop → [Your Device] → [Your App]
3. Debug like a web app!

---

## 🧪 Testing Checklist

### Functional Testing:

**Authentication:**
- [ ] Sign up works
- [ ] Log in works
- [ ] Log out works
- [ ] Password reset works

**Core Features:**
- [ ] View communities
- [ ] Create community
- [ ] Join video call
- [ ] Audio/video works
- [ ] Screen share works (if applicable)
- [ ] Chat works
- [ ] Notifications work

**Permissions:**
- [ ] Camera permission prompt appears
- [ ] Microphone permission prompt appears
- [ ] Permissions can be granted
- [ ] Permissions can be denied
- [ ] App handles denial gracefully
- [ ] Can change permissions in settings

**Navigation:**
- [ ] All pages accessible
- [ ] Back button works (Android)
- [ ] Deep links work
- [ ] Navigation persists across app restart

**Performance:**
- [ ] App launches in < 3 seconds
- [ ] No frame drops during normal use
- [ ] Video calls are smooth
- [ ] No memory leaks
- [ ] Battery usage is reasonable

### Platform-Specific Testing:

**Android:**
- [ ] Test on Android 8, 10, 12, 13+
- [ ] Test on different screen sizes
- [ ] Test on devices with/without notch
- [ ] Back button behavior correct
- [ ] Recent apps preview shows correctly
- [ ] App icon shows in all contexts

**iOS:**
- [ ] Test on iPhone 8, 12, 14, 15
- [ ] Test on iPad (if supported)
- [ ] Test on devices with/without notch
- [ ] Safe area respected
- [ ] App icon shows in all contexts
- [ ] Spotlight search works

---

## 🐛 Common Build Issues & Solutions

### Issue: "out directory not found"

**Solution:**
```powershell
# Build failed or didn't run
npm run build:capacitor

# Check if out directory created
Test-Path out
```

### Issue: "Module not found" errors

**Solution:**
```powershell
# Clear cache and reinstall
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: "API routes not working in mobile"

**Solution:**
This is expected! Mobile builds use static export.
- Deploy web version to Vercel/Netlify
- Set `NEXT_PUBLIC_API_URL` to deployed URL
- Mobile app calls your deployed API

### Issue: Android Gradle sync fails

**Solution:**
```powershell
# Clean Gradle cache
cd android
./gradlew clean

# Or delete .gradle folder
Remove-Item -Recurse -Force .gradle
```

### Issue: iOS build fails with "Command PhaseScriptExecution failed"

**Solution:**
```bash
# Clean build folder
# Xcode: Product → Clean Build Folder (⌘⇧K)

# Update pods
cd ios/App
pod install
```

### Issue: "WebView not loading content"

**Solution:**
1. Verify `out/` directory has content
2. Check `capacitor.config.ts` has correct `webDir: 'out'`
3. Re-sync: `npm run cap:sync`
4. Check network requests in dev tools

### Issue: White screen on launch

**Solutions:**
1. Check browser console in dev tools
2. Verify all assets loaded
3. Check for JavaScript errors
4. Ensure API URL is correct
5. Test with simpler page first

---

## 📊 Build Size Optimization

### Check Build Size:

```powershell
# After building
Get-ChildItem out -Recurse | Measure-Object -Property Length -Sum

# Should be under 10MB for optimal performance
```

### Reduce Build Size:

1. **Optimize images:**
   ```powershell
   # Use WebP format
   # Compress with tools like TinyPNG
   ```

2. **Remove unused dependencies:**
   ```powershell
   npm uninstall unused-package
   ```

3. **Enable minification:**
   Already enabled in production builds

4. **Lazy load components:**
   ```typescript
   // Use dynamic imports
   const HeavyComponent = dynamic(() => import('./HeavyComponent'))
   ```

---

## 🚀 Pre-Deployment Checklist

### Before Building Release:

**Code:**
- [ ] All features implemented
- [ ] All bugs fixed
- [ ] Console.logs removed
- [ ] Debug code removed
- [ ] Environment variables set

**Assets:**
- [ ] App icons generated (all sizes)
- [ ] Splash screens created
- [ ] Screenshots prepared
- [ ] Marketing assets ready

**Configuration:**
- [ ] Bundle ID set correctly
- [ ] App name set
- [ ] Version numbers updated
- [ ] Permissions configured
- [ ] Signing configured

**Testing:**
- [ ] Tested on real devices
- [ ] All features work
- [ ] No crashes
- [ ] Performance acceptable
- [ ] Permissions work

**Documentation:**
- [ ] Privacy policy published
- [ ] Support email set up
- [ ] Release notes written
- [ ] App description ready

---

## 📝 Build Commands Reference

```powershell
# Web builds
npm run build:web          # Normal Next.js build
npm run dev                # Development server

# Mobile builds
npm run build:capacitor    # Static export for mobile

# Sync to platforms
npm run cap:sync           # Sync to all platforms
npm run cap:sync:ios       # Sync to iOS only
npm run cap:sync:android   # Sync to Android only

# Open in IDEs
npm run cap:open:ios       # Open in Xcode (macOS)
npm run cap:open:android   # Open in Android Studio

# Quick workflows
npm run mobile:build       # Build + sync all
npm run mobile:ios         # Build + sync + open iOS
npm run mobile:android     # Build + sync + open Android
```

---

## ✅ Test Results Documentation

Create `TEST_RESULTS.md` to track testing:

```markdown
# Test Results

## Build Info
- Date: [DATE]
- Version: 1.0.0
- Build: 1

## Web Testing
- [x] Builds successfully
- [x] All features work
- [x] No console errors

## Android Testing
- [x] Builds successfully
- [x] Installs on device
- [x] All features work
- Devices tested: Pixel 6 (Android 13)

## iOS Testing
- [x] Builds successfully
- [x] Installs on device
- [x] All features work
- Devices tested: iPhone 14 (iOS 17)

## Issues Found
1. [Issue description]
   - Status: Fixed/Open
   - Solution: [If fixed]
```

---

## 🎯 Success Criteria

Your app is ready for store submission when:

✅ **Builds:**
- Web build succeeds
- Capacitor build succeeds
- Android build succeeds (or iOS if you have Mac)
- No build errors or warnings

✅ **Testing:**
- Tested on at least 2 real devices per platform
- All core features work
- No critical bugs
- Performance is acceptable
- Permissions work correctly

✅ **Assets:**
- All icons present
- Splash screens work
- Branding consistent

✅ **Documentation:**
- Privacy policy published
- Support channels set up
- Release notes prepared

---

## 🆘 Getting Help

If you encounter issues:

1. **Check documentation:**
   - `CAPACITOR_IMPORTANT.md`
   - `DEPLOYMENT_CHECKLIST.md`
   - Other guides in this project

2. **Search for errors:**
   - Copy error message
   - Search on Google
   - Check Stack Overflow

3. **Community support:**
   - Capacitor Discord: https://discord.gg/UPYYRhtyzp
   - Next.js Discussions: https://github.com/vercel/next.js/discussions

4. **Debug tools:**
   - Chrome DevTools (Android)
   - Safari Web Inspector (iOS)
   - Xcode Console
   - Android Logcat

---

## ✅ You're Almost There!

Your app setup is complete. Follow this guide to:
1. Build for mobile platforms
2. Test thoroughly
3. Fix any issues
4. Deploy to app stores!

See `FINAL_DEPLOYMENT_GUIDE.md` for the complete deployment workflow.

Good luck! 🚀
