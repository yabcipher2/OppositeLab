# ✅ Deployment Checklist

Use this checklist to track your progress deploying OppositeLab to PWA, iOS App Store, and Google Play Store.

## 📋 Initial Setup

- [ ] Install dependencies: `npm install cross-env --save-dev`
- [ ] Run Capacitor setup: `.\setup-capacitor.ps1`
- [ ] Initialize Capacitor: `npm run cap:init`
- [ ] Test PWA locally: `npm run dev` and verify manifest loads
- [ ] Test install prompt on mobile browser
- [ ] Verify service worker registers correctly

## 🌐 PWA Deployment (Web)

### Pre-Deployment
- [ ] Update app metadata in `src/app/layout.tsx` if needed
- [ ] Verify all icons are present in `/public/icons/`
- [ ] Test PWA on multiple browsers (Chrome, Edge, Safari)
- [ ] Check Lighthouse PWA score (aim for 90+)
- [ ] Test offline functionality

### Deployment
- [ ] Deploy to hosting (Vercel/Netlify recommended)
- [ ] Ensure site uses HTTPS (required for PWA)
- [ ] Test deployed PWA on mobile devices
- [ ] Verify install prompt appears
- [ ] Test "Add to Home Screen" on iOS and Android
- [ ] Confirm service worker updates properly

### Post-Deployment
- [ ] Monitor Web Vitals in production
- [ ] Set up analytics for PWA installs
- [ ] Test all features work in standalone mode

---

## 🍎 iOS App Store Deployment

### Prerequisites
- [ ] macOS computer available
- [ ] Xcode 14+ installed
- [ ] Apple Developer Account ($99/year)
- [ ] Apple Developer account added to Xcode

### Initial Setup
- [ ] Add iOS platform: `npm run cap:add:ios`
- [ ] Open project in Xcode: `npm run cap:open:ios`
- [ ] Update Bundle Identifier to unique ID (e.g., `com.yourcompany.oppositelab`)
- [ ] Select your development team in Xcode
- [ ] Configure signing certificates

### App Configuration
- [ ] Add app icons to Xcode (all required sizes)
  - Use https://www.appicon.co/ to generate from your icon
- [ ] Update app name in Xcode if needed
- [ ] Set deployment target (iOS 13.0+ recommended)
- [ ] Add required permissions to Info.plist:
  - [ ] Camera usage description (for video calls)
  - [ ] Microphone usage description (for video calls)
  - [ ] Photo library usage (if needed)

### Build & Test
- [ ] Build static export: `npm run build:capacitor`
- [ ] Sync to iOS: `npm run cap:sync:ios`
- [ ] Build in Xcode: `Product → Build`
- [ ] Fix any build errors
- [ ] Test on iOS Simulator
- [ ] Test on real iPhone device
- [ ] Verify all features work (video calls, camera, etc.)

### App Store Submission
- [ ] Create app listing in App Store Connect
- [ ] Prepare app screenshots (required sizes):
  - [ ] 6.7" iPhone (1290×2796)
  - [ ] 6.5" iPhone (1284×2778 or 1242×2688)
  - [ ] 5.5" iPhone (1242×2208)
- [ ] Write app description and keywords
- [ ] Set app category
- [ ] Set pricing (free or paid)
- [ ] Archive app: `Product → Archive`
- [ ] Validate archive
- [ ] Upload to App Store Connect
- [ ] Fill in additional app information
- [ ] Complete privacy questionnaire
- [ ] Submit for review

### After Submission
- [ ] Monitor review status (typically 1-3 days)
- [ ] Respond to any review feedback
- [ ] Once approved, release app

---

## 🤖 Google Play Store Deployment

### Prerequisites
- [ ] Android Studio installed
- [ ] Java JDK 11+ installed
- [ ] Google Play Console account ($25 one-time fee)

### Initial Setup
- [ ] Add Android platform: `npm run cap:add:android`
- [ ] Open project in Android Studio: `npm run cap:open:android`
- [ ] Update application ID in `build.gradle`
- [ ] Set version code and version name

### Signing Configuration
- [ ] Generate signing key:
  ```bash
  keytool -genkey -v -keystore oppositelab-release.keystore \
    -alias oppositelab -keyalg RSA -keysize 2048 -validity 10000
  ```
- [ ] Store keystore file securely (NEVER commit to git)
- [ ] Create `android/key.properties` with signing info
- [ ] Configure signing in `android/app/build.gradle`
- [ ] Add `key.properties` and `*.keystore` to `.gitignore`

### App Configuration
- [ ] Add app icons to Android (all densities):
  - [ ] mdpi (48×48)
  - [ ] hdpi (72×72)
  - [ ] xhdpi (96×96)
  - [ ] xxhdpi (144×144)
  - [ ] xxxhdpi (192×192)
- [ ] Update app name in `strings.xml` if needed
- [ ] Add required permissions to `AndroidManifest.xml`:
  - [ ] Camera (for video calls)
  - [ ] Microphone (for video calls)
  - [ ] Internet access (should be there by default)

### Build & Test
- [ ] Build static export: `npm run build:capacitor`
- [ ] Sync to Android: `npm run cap:sync:android`
- [ ] Build in Android Studio: `Build → Make Project`
- [ ] Fix any build errors
- [ ] Test on Android Emulator
- [ ] Test on real Android device
- [ ] Verify all features work

### Play Store Submission
- [ ] Build release AAB:
  ```bash
  cd android
  ./gradlew bundleRelease
  ```
- [ ] Locate AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- [ ] Create app listing in Google Play Console
- [ ] Upload AAB file
- [ ] Prepare store listing:
  - [ ] App screenshots (at least 2):
    - Phone screenshots (min 2, max 8)
    - 7-inch tablet screenshots (optional)
    - 10-inch tablet screenshots (optional)
  - [ ] Feature graphic (1024×500)
  - [ ] App icon (512×512)
- [ ] Write short and full descriptions
- [ ] Set app category
- [ ] Complete content rating questionnaire
- [ ] Set pricing and distribution
- [ ] Review release details
- [ ] Submit for review

### After Submission
- [ ] Monitor review status (few hours to few days)
- [ ] Respond to any review feedback
- [ ] Once approved, publish app

---

## 🔄 Update Workflow

### For PWA Updates
- [ ] Make code changes
- [ ] Test locally: `npm run dev`
- [ ] Build for web: `npm run build:web`
- [ ] Deploy to hosting
- [ ] PWA updates automatically for users

### For iOS App Updates
- [ ] Make code changes
- [ ] Increment version in `package.json`
- [ ] Increment version in Xcode (General → Identity)
- [ ] Build: `npm run build:capacitor`
- [ ] Sync: `npm run cap:sync:ios`
- [ ] Archive in Xcode
- [ ] Upload to App Store Connect
- [ ] Submit update for review

### For Android App Updates
- [ ] Make code changes
- [ ] Increment `versionCode` in `build.gradle`
- [ ] Increment `versionName` in `build.gradle`
- [ ] Build: `npm run build:capacitor`
- [ ] Sync: `npm run cap:sync:android`
- [ ] Build release AAB
- [ ] Upload to Play Console
- [ ] Submit update for review

---

## 🎯 Post-Launch

### Monitoring
- [ ] Set up analytics (Google Analytics, Firebase, etc.)
- [ ] Monitor crash reports
- [ ] Track user engagement
- [ ] Monitor app store reviews
- [ ] Track PWA install rates

### Marketing
- [ ] Prepare launch announcement
- [ ] Share on social media
- [ ] Update website with download links
- [ ] Create promotional materials
- [ ] Reach out to press/blogs if relevant

### Maintenance
- [ ] Respond to user reviews
- [ ] Fix reported bugs
- [ ] Add requested features
- [ ] Keep dependencies updated
- [ ] Monitor security advisories

---

## 📊 Testing Matrix

Test on these platforms before submitting:

### Browsers (PWA)
- [ ] Chrome (Windows)
- [ ] Chrome (macOS)
- [ ] Chrome (Android)
- [ ] Safari (macOS)
- [ ] Safari (iOS)
- [ ] Edge (Windows)
- [ ] Firefox (Windows/macOS)

### iOS Devices
- [ ] iPhone SE (small screen)
- [ ] iPhone 13/14/15 (standard)
- [ ] iPhone 13/14/15 Pro Max (large)
- [ ] iPad (tablet)

### Android Devices
- [ ] Small phone (< 5.5")
- [ ] Standard phone (5.5" - 6.5")
- [ ] Large phone (> 6.5")
- [ ] Tablet

### Features to Test
- [ ] App launches without errors
- [ ] All pages load correctly
- [ ] Navigation works
- [ ] Authentication works
- [ ] Video calls function properly
- [ ] Camera/microphone permissions work
- [ ] Offline mode works
- [ ] Push notifications (if implemented)
- [ ] Deep links work
- [ ] App doesn't crash during normal use

---

## 📝 Notes

### Important Reminders
- Test thoroughly before submission
- Both App Store and Play Store have review processes
- Reviews typically take 1-3 days (iOS) or few hours (Android)
- Apps can be rejected - address feedback and resubmit
- Keep your signing keys and credentials secure
- Monitor your apps after launch

### Getting Help
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Play Store Policies: https://play.google.com/about/developer-content-policy/
- Capacitor Docs: https://capacitorjs.com/docs
- Your documentation: `PWA_CAPACITOR_GUIDE.md`

---

**Good luck with your launch! 🚀**

Track your progress and check off items as you complete them.
