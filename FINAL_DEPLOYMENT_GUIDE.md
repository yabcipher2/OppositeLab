# 🚀 Final Deployment Guide - Complete Walkthrough

## 📋 Overview

This guide brings everything together for deploying OppositeLab to:
- ✅ Web (PWA) - Progressive Web App
- ✅ iOS App Store
- ✅ Google Play Store

---

## 🎯 Prerequisites Checklist

### Accounts & Tools

- [ ] **Apple Developer Account** - $99/year (iOS only)
  - Sign up: https://developer.apple.com/programs/

- [ ] **Google Play Console Account** - $25 one-time (Android only)
  - Sign up: https://play.google.com/console

- [ ] **Web Hosting** (for PWA and API)
  - Vercel (recommended, free tier)
  - Netlify (alternative)
  - Your own server

- [ ] **Domain Name** (optional but recommended)
  - oppositelab.com or similar

### Software (Development Machine)

- [ ] **Node.js 18+** installed
- [ ] **Git** installed
- [ ] **Code editor** (VS Code recommended)

### For iOS (macOS only):
- [ ] **macOS computer** (or cloud Mac)
- [ ] **Xcode 14+** installed
- [ ] **CocoaPods** (usually comes with Xcode)

### For Android (any OS):
- [ ] **Android Studio** installed
- [ ] **Java JDK 11+** installed
- [ ] **Android SDK** configured

---

## 📱 Part 1: Deploy Web App (PWA)

Your web app serves two purposes:
1. Progressive Web App (installable on browsers)
2. API backend for mobile apps

### Step 1: Configure Environment

Create `.env.production`:
```bash
# MongoDB
MONGODB_URI=your_mongodb_connection_string

# LiveKit (for video calls)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# App URL
NEXT_PUBLIC_API_URL=https://oppositelab.vercel.app
```

### Step 2: Test Production Build Locally

```powershell
# Build for production
npm run build:web

# Test locally
npm start

# Visit http://localhost:3000
# Test all features
# Verify PWA install prompt appears
```

### Step 3: Deploy to Vercel (Recommended)

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Set project name: oppositelab
# - Configure environment variables
# - Wait for deployment
```

**Or use Vercel Dashboard:**
1. Go to https://vercel.com
2. Import Git repository
3. Configure environment variables
4. Deploy

### Step 4: Configure Custom Domain (Optional)

```powershell
# Add domain in Vercel
vercel domains add oppositelab.com

# Update DNS records (in your domain registrar):
# A record: @ → 76.76.21.21
# CNAME: www → cname.vercel-dns.com
```

### Step 5: Verify PWA

1. Visit your deployed URL
2. Open DevTools → Application → Manifest
3. Check for install prompt
4. Test "Add to Home Screen" on mobile
5. Verify offline functionality

---

## 🤖 Part 2: Deploy to Google Play Store

### Step 1: Prepare Icons

**Option A: Use AppIcon.co (Easiest)**
1. Go to https://www.appicon.co/
2. Upload `public/icons/oppositelab-512.png`
3. Select Android
4. Download and extract
5. Copy mipmap folders to `android/app/src/main/res/`

**Option B: Manual**
- See `ICON_SETUP_INSTRUCTIONS.md`

### Step 2: Generate Signing Key

```powershell
# In project root
keytool -genkey -v -keystore oppositelab-release.keystore -alias oppositelab -keyalg RSA -keysize 2048 -validity 10000

# Follow prompts:
# - Enter passwords (remember these!)
# - Enter your details
# - Keystore saved to: oppositelab-release.keystore
```

**⚠️ BACKUP THIS FILE!** You cannot update your app without it.

### Step 3: Configure Signing

Create `android/key.properties`:
```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=oppositelab
storeFile=../oppositelab-release.keystore
```

Update `android/app/build.gradle`:
```gradle
// Add at top (before android {)
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
    
    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

### Step 4: Build Release APK/AAB

```powershell
# Set environment for mobile build
$env:CAPACITOR_BUILD="true"
$env:NEXT_PUBLIC_API_URL="https://oppositelab.vercel.app"

# Build Next.js
npm run build:capacitor

# Sync to Android
npm run cap:sync:android

# Build signed AAB
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Step 5: Test Release Build

```powershell
# Build APK for testing
cd android
./gradlew assembleRelease

# Install on device
adb install app/build/outputs/apk/release/app-release.apk

# Test all features on real device
```

### Step 6: Create Play Store Listing

1. Go to https://play.google.com/console
2. Create app ($25 one-time fee if first app)
3. Fill in app details:
   - **App name:** OppositeLab
   - **Default language:** English (US)
   - **App type:** App
   - **Free or paid:** Free

### Step 7: Upload AAB

1. In Play Console → Your App → Release → Production
2. Create new release
3. Upload `app-release.aab`
4. Add release notes
5. Save (don't submit yet)

### Step 8: Complete Store Listing

**Store listing:**
- [ ] App name: OppositeLab
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (minimum 2, max 8):
  - Phone screenshots required
  - Tablet screenshots optional

**Categorization:**
- [ ] App category: Communication / Social
- [ ] Tags (optional)

**Contact details:**
- [ ] Email address
- [ ] Phone number (optional)
- [ ] Website URL

**Privacy:**
- [ ] Privacy policy URL (REQUIRED)

**Content rating:**
- [ ] Complete questionnaire
- [ ] Get rating (E for Everyone typically)

**App access:**
- [ ] Instructions for testing (if login required)
- [ ] Demo account credentials (if needed)

**Ads:**
- [ ] Does app contain ads? Yes/No

**Content:**
- [ ] Target audience and content
- [ ] News app declaration (if applicable)

### Step 9: Submit for Review

1. Review all sections (must be complete)
2. Click "Send for review"
3. Wait for review (few hours to few days)
4. Check email for status updates

---

## 🍎 Part 3: Deploy to iOS App Store

### Step 1: Prepare Icons

**Option A: Use AppIcon.co**
1. Go to https://www.appicon.co/
2. Upload `public/icons/oppositelab-512.png`
3. Select iOS
4. Download and extract
5. Copy all icons to `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
6. Copy `Contents.json` too

**Option B: Manual**
- See `ICON_SETUP_INSTRUCTIONS.md`

### Step 2: Open in Xcode

```bash
# Build for Capacitor
npm run build:capacitor

# Sync to iOS
npm run cap:sync:ios

# Open in Xcode
npm run cap:open:ios
```

### Step 3: Configure Signing

1. Select "App" in left sidebar
2. Select "App" under TARGETS
3. Signing & Capabilities tab
4. **Team:** Select your Apple Developer team
5. **Bundle Identifier:** Verify `com.oppositelab.app`
6. **Automatically manage signing:** Check this
7. Wait for Xcode to configure certificates

### Step 4: Set Version

1. General tab
2. Identity section:
   - **Display Name:** OppositeLab
   - **Version:** 1.0.0
   - **Build:** 1

### Step 5: Build and Archive

1. **Select Device:** "Any iOS Device (arm64)"
2. **Product → Archive**
3. Wait for build (1-5 minutes)
4. Organizer window opens

### Step 6: Validate and Upload

1. Select archive
2. Click "Validate App"
3. Choose team
4. Click "Validate" and wait
5. If no errors, click "Distribute App"
6. Choose "App Store Connect"
7. Click "Upload"
8. Wait for upload (can take 10+ minutes)

### Step 7: Wait for Processing

1. Go to https://appstoreconnect.apple.com
2. My Apps → OppositeLab → TestFlight
3. Wait for "Processing" to complete (5-30 minutes)
4. Status changes to "Ready to Submit"

### Step 8: Create App Store Listing

1. **App Store → Your App → Prepare for Submission**

2. **Version Information:**
   - [ ] Screenshots (REQUIRED):
     - 6.7" iPhone (1290×2796) - min 1, max 10
     - 6.5" iPhone (1284×2778) - min 1, max 10
     - 5.5" iPhone (1242×2208) - min 1, max 10
   - [ ] Description (4000 chars)
   - [ ] Keywords (100 chars)
   - [ ] Support URL
   - [ ] Marketing URL (optional)

3. **General Information:**
   - [ ] App icon (1024x1024)
   - [ ] Copyright
   - [ ] Age rating
   - [ ] Category: Social Networking or Utilities

4. **App Review Information:**
   - [ ] Contact information
   - [ ] Demo account (if login required)
   - [ ] Notes for reviewer

5. **Version Release:**
   - [ ] Manually release
   - [ ] Automatically after approval

### Step 9: Add Build

1. Build section → Click "+"
2. Select uploaded build
3. Export Compliance: Answer questions
4. Save

### Step 10: Submit for Review

1. Click "Submit for Review"
2. Answer additional questions:
   - [ ] Export compliance
   - [ ] Content rights
   - [ ] Advertising identifier
   - [ ] Government regulations
3. Submit

4. Wait for review (typically 24-48 hours)

---

## 📊 Complete Deployment Script

Add these to `package.json`:

```json
{
  "scripts": {
    "deploy:web": "vercel --prod",
    
    "deploy:android:prep": "cross-env CAPACITOR_BUILD=true npm run build && npm run cap:sync:android",
    "deploy:android:build": "npm run deploy:android:prep && cd android && ./gradlew bundleRelease",
    
    "deploy:ios:prep": "cross-env CAPACITOR_BUILD=true npm run build && npm run cap:sync:ios",
    "deploy:ios:open": "npm run deploy:ios:prep && npm run cap:open:ios"
  }
}
```

Usage:
```powershell
# Deploy web
npm run deploy:web

# Build Android AAB
npm run deploy:android:build

# Prepare and open iOS in Xcode
npm run deploy:ios:open
```

---

## 🧪 Pre-Submission Testing Checklist

### Web (PWA):
- [ ] Works in Chrome, Safari, Edge, Firefox
- [ ] Install prompt appears
- [ ] Can install on desktop
- [ ] Can install on mobile
- [ ] Offline mode works
- [ ] Service worker updates correctly
- [ ] All API calls work
- [ ] Video calls function
- [ ] No console errors

### Android:
- [ ] Installs on phone
- [ ] App icon displays correctly
- [ ] Splash screen shows
- [ ] All screens load
- [ ] Camera permission works
- [ ] Microphone permission works
- [ ] Video calls work
- [ ] No crashes
- [ ] Back button works correctly
- [ ] Rotation works (if supported)
- [ ] Tested on Android 8, 10, 12, 13+

### iOS:
- [ ] Installs on iPhone
- [ ] App icon displays correctly
- [ ] Splash screen shows
- [ ] All screens load
- [ ] Camera permission works
- [ ] Microphone permission works
- [ ] Video calls work
- [ ] No crashes
- [ ] Rotation works (if supported)
- [ ] Tested on iPhone 8, 12, 14, 15
- [ ] Tested on iPad (if supported)

---

## 📞 Review Times

### Web (PWA):
- **Deploy:** Instant
- **Updates:** Instant

### Google Play Store:
- **Initial review:** Few hours to few days
- **Updates:** Same
- **Expedited review:** Not available

### iOS App Store:
- **Initial review:** 24-48 hours typically
- **Updates:** Same
- **Expedited review:** Available for critical fixes

---

## 🐛 Common Rejection Reasons

### Both Stores:

1. **App crashes on launch**
   - Test thoroughly on real devices
   - Check all permissions work

2. **Broken features**
   - Test all core functionality
   - Ensure video calls work

3. **Missing privacy policy**
   - Create and publish privacy policy
   - Add URL to store listings

4. **Inaccurate screenshots**
   - Screenshots must show actual app
   - Must be current version

5. **Unclear app description**
   - Explain what app does
   - List key features

### iOS Specific:

1. **Guideline 2.1** - App completeness
   - Remove debug code
   - No placeholder content

2. **Guideline 4.3** - Spam
   - App must be unique
   - Can't be duplicate of existing app

3. **Guideline 5.1.1** - Privacy
   - All permissions explained
   - Privacy policy required

### Android Specific:

1. **Permissions**
   - Only request necessary permissions
   - Explain why each is needed

2. **Target SDK**
   - Must target recent Android SDK
   - Update annually

---

## 🔄 Update Workflow

### For Future Updates:

```powershell
# 1. Update version numbers
# iOS: Xcode → General → Version and Build
# Android: android/app/build.gradle → versionCode and versionName

# 2. Make code changes

# 3. Test locally

# 4. Deploy web
npm run deploy:web

# 5. Build Android
npm run deploy:android:build
# Upload AAB to Play Console

# 6. Build iOS
npm run deploy:ios:open
# Archive and upload in Xcode

# 7. Submit both for review
```

---

## 📋 Final Checklist

### Before Launching:

**Web:**
- [ ] Deployed to production
- [ ] Custom domain configured (if using)
- [ ] HTTPS enabled
- [ ] Environment variables set
- [ ] PWA tested and working

**Android:**
- [ ] Icons generated and added
- [ ] Keystore created and backed up
- [ ] Signing configured
- [ ] AAB built and signed
- [ ] Tested on real devices
- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy added
- [ ] Submitted for review

**iOS:**
- [ ] Icons generated and added
- [ ] Signing configured in Xcode
- [ ] Archive uploaded
- [ ] Build processed
- [ ] Store listing complete
- [ ] Screenshots uploaded
- [ ] Privacy policy added
- [ ] Submitted for review

**General:**
- [ ] Privacy policy published
- [ ] Support email set up
- [ ] Monitoring/analytics configured
- [ ] Crash reporting enabled
- [ ] Backup of all signing keys
- [ ] Documentation updated

---

## 🎉 Launch Day!

### When Approved:

1. **Announce on social media**
   - Share app store links
   - Create promotional post

2. **Monitor reviews**
   - Respond to user feedback
   - Fix reported issues quickly

3. **Track metrics**
   - Downloads/installs
   - Active users
   - Crash reports
   - User ratings

4. **Prepare updates**
   - Bug fixes
   - New features
   - Performance improvements

---

## 📱 Download Links Format

```
🌐 Web: https://oppositelab.com
📱 iOS: https://apps.apple.com/app/oppositelab/id[YOUR_APP_ID]
🤖 Android: https://play.google.com/store/apps/details?id=com.oppositelab.app
```

---

## 🆘 Getting Help

### Resources:
- **Documentation:** See other .md files in this project
- **Capacitor Docs:** https://capacitorjs.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Apple Developer:** https://developer.apple.com/support
- **Google Play:** https://support.google.com/googleplay/android-developer

### Support:
- Stack Overflow (tag: capacitor, nextjs, ios, android)
- Capacitor Discord: https://discord.gg/UPYYRhtyzp
- GitHub Issues (for Capacitor bugs)

---

## ✅ You're Ready!

Everything is set up and ready for deployment:

- ✅ Capacitor configured
- ✅ iOS platform added
- ✅ Android platform added
- ✅ Permissions configured
- ✅ Icons guide created
- ✅ Signing guides created
- ✅ Deployment scripts ready

**Next:** Follow this guide step-by-step to deploy to all three platforms!

Good luck with your launch! 🚀🎉
