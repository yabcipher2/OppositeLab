# 📱 PWA + Capacitor Setup Guide for OppositeLab

This guide walks you through deploying OppositeLab as a Progressive Web App (PWA) and native mobile apps for iOS App Store and Google Play Store.

## 🎯 What's Been Set Up

Your app now supports:
- ✅ **Web PWA** - Installable on any browser
- ✅ **iOS App Store** - Native iOS app via Capacitor
- ✅ **Google Play Store** - Native Android app via Capacitor
- ✅ **Offline Support** - Service worker with caching
- ✅ **Install Prompts** - Smart install banner for web users

---

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
# Install cross-env for environment variables
npm install cross-env --save-dev

# Install Capacitor (run the PowerShell script)
.\setup-capacitor.ps1

# OR install manually:
npm install @capacitor/core @capacitor/cli --save-dev
npm install @capacitor/ios @capacitor/android --save
```

### Step 2: Test PWA Locally

```bash
# Start development server
npm run dev

# Open http://localhost:3000
# The PWA should work automatically
# Test the install prompt (appears on supported browsers)
```

### Step 3: Build for Production

```bash
# Build for web (normal Next.js build with API routes)
npm run build:web

# Build for mobile (static export without API routes)
npm run build:capacitor
```

---

## 📦 PWA Features

### What's Working

1. **Web App Manifest** (`/public/manifest.json`)
   - App name, icons, theme colors
   - "Add to Home Screen" support
   - Splash screen configuration

2. **Service Worker** (`/public/sw.js`)
   - Offline caching
   - Network-first strategy
   - Automatic cache updates

3. **Install Prompt** (`/src/components/PWAInstaller.tsx`)
   - Smart banner for installable PWA
   - User-friendly install flow
   - Dismissible prompt

### Testing PWA

#### On Desktop (Chrome/Edge):
1. Open DevTools → Application → Manifest
2. Check manifest loads correctly
3. Click "Install" button in address bar
4. Or use the install prompt banner

#### On Android:
1. Open in Chrome
2. Tap menu → "Install app" or "Add to Home Screen"
3. App installs like a native app

#### On iOS (Safari):
1. Tap Share button
2. Select "Add to Home Screen"
3. App appears on home screen

---

## 📱 Capacitor Setup (iOS & Android)

### Prerequisites

**For iOS Development:**
- macOS required
- Xcode 14+ installed
- Apple Developer Account ($99/year)

**For Android Development:**
- Android Studio installed
- Java JDK 11+ installed
- Android SDK configured

### Initialize Capacitor

```bash
# Initialize (only needed once)
npm run cap:init
# When prompted:
# - App name: OppositeLab
# - App ID: com.oppositelab.app
# - Web directory: out

# Add iOS platform
npm run cap:add:ios

# Add Android platform
npm run cap:add:android
```

### Build & Sync to Native Platforms

```bash
# Build and sync to both platforms
npm run mobile:build

# Or individually:
npm run build:capacitor      # Build static export
npm run cap:sync:ios         # Sync to iOS
npm run cap:sync:android     # Sync to Android
```

### Open in Native IDEs

```bash
# Open iOS project in Xcode
npm run mobile:ios

# Open Android project in Android Studio
npm run mobile:android

# Or manually:
npm run cap:open:ios
npm run cap:open:android
```

---

## ⚙️ Environment Configuration

### For Web Deployment (with API routes)

Normal Next.js deployment to Vercel/Netlify:

```bash
# .env.production
NEXT_PUBLIC_API_URL=https://oppositelab.vercel.app
```

### For Mobile Apps (static export)

Mobile apps need to call your deployed API:

```bash
# .env.production.local
CAPACITOR_BUILD=true
NEXT_PUBLIC_API_URL=https://oppositelab.vercel.app
MONGODB_URI=your_mongodb_connection_string
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret
```

**Important:** Mobile builds use static export and cannot use Next.js API routes. See `CAPACITOR_IMPORTANT.md` for details.

---

## 🍎 iOS App Store Deployment

### 1. Configure in Xcode

```bash
npm run mobile:ios
```

In Xcode:
1. Select project in navigator
2. Update **Bundle Identifier**: `com.oppositelab.app`
3. Select **Team** (your Apple Developer account)
4. Configure **Signing & Capabilities**
5. Set **Deployment Target**: iOS 13.0+

### 2. Add App Icons

Place icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

Sizes needed:
- 20x20 @2x, @3x
- 29x29 @2x, @3x
- 40x40 @2x, @3x
- 60x60 @2x, @3x
- 1024x1024 (App Store)

Use online tools: https://www.appicon.co/

### 3. Update Info.plist

Add permissions in `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>OppositeLab needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>OppositeLab needs microphone access for video calls</string>
```

### 4. Build for Release

1. In Xcode: Product → Archive
2. Wait for archive to complete
3. Click "Distribute App"
4. Select "App Store Connect"
5. Follow prompts to upload

### 5. Submit to App Store

1. Go to https://appstoreconnect.apple.com
2. Create new app listing
3. Upload screenshots (required sizes)
4. Fill in app description, keywords
5. Submit for review

**Review Time:** 1-3 days typically

---

## 🤖 Google Play Store Deployment

### 1. Configure Android App

```bash
npm run mobile:android
```

In Android Studio:
1. Open `android/app/build.gradle`
2. Update `applicationId`: `"com.oppositelab.app"`
3. Update `versionCode` and `versionName`

### 2. Generate Signing Key

```bash
# In your project root
keytool -genkey -v -keystore oppositelab-release.keystore -alias oppositelab -keyalg RSA -keysize 2048 -validity 10000

# Keep this file safe and NEVER commit to git!
```

### 3. Configure Signing

Create `android/key.properties`:

```properties
storePassword=your_store_password
keyPassword=your_key_password
keyAlias=oppositelab
storeFile=../oppositelab-release.keystore
```

Update `android/app/build.gradle`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 4. Add App Icon

Place icon in `android/app/src/main/res/`:
- `mipmap-mdpi/` - 48x48
- `mipmap-hdpi/` - 72x72
- `mipmap-xhdpi/` - 96x96
- `mipmap-xxhdpi/` - 144x144
- `mipmap-xxxhdpi/` - 192x192

### 5. Build Release APK/AAB

```bash
cd android
./gradlew assembleRelease    # For APK
./gradlew bundleRelease       # For AAB (recommended)
```

Output:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

### 6. Submit to Play Store

1. Go to https://play.google.com/console
2. Create app ($25 one-time fee)
3. Upload AAB file
4. Add screenshots (required):
   - Phone: 2-8 screenshots
   - 7-inch tablet: 2-8 screenshots (optional)
   - 10-inch tablet: 2-8 screenshots (optional)
5. Fill in store listing
6. Complete content rating questionnaire
7. Set pricing & distribution
8. Submit for review

**Review Time:** A few hours to a few days

---

## 🔄 Update Workflow

### For Web (PWA):

```bash
# Make changes
npm run build:web
# Deploy to Vercel/Netlify
# PWA updates automatically on next visit
```

### For Mobile Apps:

```bash
# 1. Make changes
# 2. Update version in package.json
# 3. Build and sync
npm run mobile:build

# 4. Update native version numbers:
# iOS: ios/App/App.xcodeproj → General → Version
# Android: android/app/build.gradle → versionCode++

# 5. Build and submit updates
npm run mobile:ios      # Build in Xcode
npm run mobile:android  # Build in Android Studio
```

---

## 📊 Testing Checklist

### PWA Testing
- [ ] Manifest loads correctly
- [ ] Service worker registers
- [ ] App installs on desktop
- [ ] App installs on mobile
- [ ] Offline mode works
- [ ] Icons display correctly
- [ ] Theme color matches

### iOS Testing
- [ ] App launches successfully
- [ ] All screens render properly
- [ ] Camera/microphone permissions work
- [ ] LiveKit video calls function
- [ ] Deep links work
- [ ] Notifications work (if enabled)
- [ ] App works offline

### Android Testing
- [ ] App launches successfully
- [ ] All screens render properly
- [ ] Camera/microphone permissions work
- [ ] LiveKit video calls function
- [ ] Deep links work
- [ ] Notifications work (if enabled)
- [ ] App works offline
- [ ] Back button behavior correct

---

## 🛠️ Available npm Scripts

```bash
# Development
npm run dev                  # Start dev server

# Web builds
npm run build:web           # Normal Next.js build
npm run build:capacitor     # Static export for mobile

# Capacitor commands
npm run cap:init            # Initialize Capacitor
npm run cap:add:ios         # Add iOS platform
npm run cap:add:android     # Add Android platform
npm run cap:sync            # Sync to all platforms
npm run cap:sync:ios        # Sync to iOS only
npm run cap:sync:android    # Sync to Android only
npm run cap:open:ios        # Open in Xcode
npm run cap:open:android    # Open in Android Studio

# Quick mobile workflows
npm run mobile:build        # Build + sync to both
npm run mobile:ios          # Build + sync + open iOS
npm run mobile:android      # Build + sync + open Android
```

---

## 📚 Additional Resources

### Documentation
- **PWA:** https://web.dev/progressive-web-apps/
- **Capacitor:** https://capacitorjs.com/docs
- **Next.js Static Export:** https://nextjs.org/docs/app/building-your-application/deploying/static-exports
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Policies:** https://play.google.com/about/developer-content-policy/

### Tools
- **PWA Builder:** https://www.pwabuilder.com/
- **App Icon Generator:** https://www.appicon.co/
- **Screenshot Generator:** https://www.appstorescreenshot.com/

### Testing
- **Lighthouse:** Chrome DevTools → Lighthouse (PWA audit)
- **PWA Testing:** https://web.dev/measure/
- **iOS Simulator:** Included with Xcode
- **Android Emulator:** Included with Android Studio

---

## ⚠️ Important Notes

1. **API Routes:** Mobile builds cannot use Next.js API routes. Deploy your web version separately and point mobile apps to it.

2. **Environment Variables:** Keep production secrets secure. Never commit `.env` files.

3. **App Store Guidelines:** Review both Apple and Google guidelines before submission.

4. **Permissions:** Request only permissions you actually use.

5. **Testing:** Test thoroughly on real devices before submitting.

6. **Updates:** Both stores allow over-the-air updates for content, but native code changes require new submissions.

---

## 🆘 Troubleshooting

### PWA not installing
- Check manifest at `/manifest.json`
- Verify HTTPS (required for PWA)
- Check browser console for errors
- Ensure service worker registers

### Capacitor build fails
- Verify `out/` directory exists after build
- Check `CAPACITOR_BUILD=true` is set
- Ensure no API routes in build
- Run `npm run build:capacitor` first

### iOS build issues
- Update Xcode to latest version
- Clean build folder: Product → Clean Build Folder
- Delete `ios/` and re-add: `npm run cap:add:ios`
- Check Bundle ID matches

### Android build issues
- Update Android Studio and SDK
- Invalidate caches: File → Invalidate Caches
- Clean project: Build → Clean Project
- Check `applicationId` matches

---

## 🎉 You're All Set!

Your OppositeLab app is now ready for:
- ✅ Web deployment (with PWA)
- ✅ iOS App Store submission
- ✅ Google Play Store submission

**Next Steps:**
1. Run `npm install cross-env --save-dev`
2. Run `.\setup-capacitor.ps1`
3. Test PWA: `npm run dev`
4. Build for mobile: `npm run build:capacitor`
5. Add platforms: `npm run cap:add:ios && npm run cap:add:android`
6. Open and configure in native IDEs

Good luck with your app launch! 🚀
