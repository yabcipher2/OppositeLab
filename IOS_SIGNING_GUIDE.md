# 🍎 iOS App Signing & Certificates Guide

## Overview

iOS apps require code signing certificates from Apple to be installed on devices and submitted to the App Store. This process is more complex than Android but becomes routine once set up.

---

## ⚠️ Prerequisites

### Required:
- **macOS computer** - Windows cannot build iOS apps
- **Xcode 14+** - Free from Mac App Store
- **Apple Developer Account** - $99/year
- **Apple ID** added to Xcode

### If you don't have macOS:
- Use a Mac Mini, MacBook, or iMac
- Rent a Mac in the cloud (MacStadium, AWS EC2 Mac)
- Use a CI/CD service (GitHub Actions with macOS runner)
- Ask someone with a Mac to help with builds

---

## 🎯 Step 1: Join Apple Developer Program

### 1. Sign up:
1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with your Apple ID
4. Complete enrollment ($99/year)
5. Wait for approval (usually instant to 24 hours)

### 2. Verify enrollment:
1. Go to https://developer.apple.com/account
2. You should see "Apple Developer Program" active
3. Access to Certificates, Identifiers & Profiles

---

## 🖥️ Step 2: Set Up Xcode

### 1. Install Xcode:
```bash
# Download from Mac App Store
# Or use command line
xcode-select --install
```

### 2. Add Apple ID to Xcode:
1. Open Xcode
2. Xcode → Settings (or Preferences)
3. Accounts tab
4. Click "+" → Add Apple ID
5. Sign in with your developer account
6. Verify your team appears

---

## 📱 Step 3: Open Your Project in Xcode

```bash
# Navigate to your project
cd /path/to/oppositelab

# Open iOS project in Xcode
npm run cap:open:ios

# OR manually
open ios/App/App.xcworkspace
```

---

## 🔐 Step 4: Configure Signing (Automatic - Recommended)

### In Xcode:

1. **Select Project:**
   - Click "App" in left sidebar (blue icon)
   - Select "App" under TARGETS

2. **Signing & Capabilities tab:**
   - Uncheck "Automatically manage signing" first
   - Then re-check it (this forces refresh)
   
3. **Team:**
   - Select your team from dropdown
   - Should show your name or company

4. **Bundle Identifier:**
   - Default: `com.oppositelab.app`
   - Must be unique across all App Store apps
   - Change if needed: `com.yourcompany.oppositelab`

5. **Provisioning Profile & Signing Certificate:**
   - Should show "Xcode Managed Profile"
   - Status: No errors (may see warnings initially)

### What Xcode Does Automatically:

✅ Creates Development Certificate
✅ Creates Distribution Certificate  
✅ Creates Provisioning Profiles
✅ Registers your device
✅ Manages certificate renewal

---

## 🛠️ Step 5: Manual Signing (Advanced)

Only needed if automatic signing fails or for specific requirements.

### 1. Create App ID:

1. Go to https://developer.apple.com/account
2. Certificates, Identifiers & Profiles
3. Identifiers → "+" button
4. Choose "App IDs" → Continue
5. Description: **OppositeLab**
6. Bundle ID: **com.oppositelab.app** (Explicit)
7. Capabilities: Enable required features
   - Push Notifications (if needed)
   - Sign in with Apple (if needed)
8. Register

### 2. Create Certificates:

**Development Certificate:**
```bash
# Generate certificate signing request (CSR)
# Keychain Access → Certificate Assistant → Request Certificate from CA
# Save to disk
```

1. In Developer Portal → Certificates → "+"
2. Choose "iOS App Development"
3. Upload CSR
4. Download certificate
5. Double-click to install in Keychain

**Distribution Certificate:**
1. Same steps but choose "iOS Distribution"
2. Download and install

### 3. Create Provisioning Profiles:

**Development Profile:**
1. Profiles → "+"
2. Choose "iOS App Development"
3. Select App ID
4. Select Development Certificate
5. Select devices to test on
6. Name: "OppositeLab Dev"
7. Download and double-click to install

**Distribution Profile:**
1. Choose "App Store"
2. Select App ID
3. Select Distribution Certificate
4. Name: "OppositeLab AppStore"
5. Download and install

### 4. Configure in Xcode:

1. Signing & Capabilities
2. Uncheck "Automatically manage signing"
3. Provisioning Profile → Select your profiles
4. Signing Certificate → Should auto-select

---

## 🏗️ Step 6: Build for Testing

### Build for Simulator:

```bash
# In Xcode
# Select any iOS Simulator from device dropdown
# Product → Build (⌘B)
# Product → Run (⌘R)
```

### Build for Real Device:

```bash
# 1. Connect iPhone via USB
# 2. Trust computer on device
# 3. Select your device in Xcode
# 4. Product → Build (⌘B)
# 5. Product → Run (⌘R)

# First time: "Untrusted Developer" on device
# Fix: Settings → General → VPN & Device Management → Trust
```

### Build from command line:

```bash
# Build for simulator
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  build

# Build for device
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Debug \
  -destination 'generic/platform=iOS' \
  build
```

---

## 📦 Step 7: Archive for App Store

### Using Xcode (Recommended):

1. **Select Device:**
   - Click device dropdown (top left)
   - Select "Any iOS Device (arm64)"

2. **Archive:**
   - Product → Archive
   - Wait for build (1-5 minutes)
   - Organizer window opens

3. **Validate Archive:**
   - Select archive
   - Click "Validate App"
   - Choose your team
   - Click "Validate"
   - Fix any issues

4. **Distribute:**
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Click "Upload"
   - Wait for upload (may take a while)

### Using Command Line:

```bash
# Archive
xcodebuild -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  archive

# Export for App Store
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build \
  -exportOptionsPlist exportOptions.plist
```

**Create `exportOptions.plist`:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>uploadBitcode</key>
    <false/>
</dict>
</plist>
```

---

## 📊 Step 8: Version Management

### Update version before each release:

**In Xcode:**
1. Select App target
2. General tab
3. Identity section:
   - **Version:** 1.0.0, 1.0.1, 1.1.0 (user-visible)
   - **Build:** 1, 2, 3 (incremental number)

**Or edit manually:**

Edit `ios/App/App.xcodeproj/project.pbxproj`:
```
MARKETING_VERSION = 1.0.0;
CURRENT_PROJECT_VERSION = 1;
```

### Version Strategy:

| Release Type | Version | Build |
|--------------|---------|-------|
| First release | 1.0.0 | 1 |
| Bug fix | 1.0.1 | 2 |
| Minor update | 1.1.0 | 3 |
| Major update | 2.0.0 | 4 |

**Rules:**
- Build number must increase with each upload
- Version is user-visible (1.0.0, 1.0.1, etc.)
- TestFlight and App Store can share builds

---

## 🚀 Step 9: Submit to App Store

### 1. Create App in App Store Connect:

1. Go to https://appstoreconnect.apple.com
2. My Apps → "+" → New App
3. Fill in details:
   - **Platforms:** iOS
   - **Name:** OppositeLab
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** com.oppositelab.app
   - **SKU:** oppositelab-ios (unique identifier)
   - **User Access:** Full Access

### 2. Wait for Build Processing:

After upload, build appears in TestFlight section:
- Processing: 5-30 minutes
- Status changes to "Ready to Submit"

### 3. Add Build to Version:

1. App Store → Your App → Version
2. Build section → Click "+"
3. Select uploaded build
4. Save

### 4. Fill Required Information:

**App Information:**
- [ ] Category
- [ ] Content rights
- [ ] Age rating
- [ ] Privacy policy URL

**Pricing:**
- [ ] Free or Paid
- [ ] Availability (countries)

**Version Information:**
- [ ] Screenshots (required sizes)
- [ ] Description
- [ ] Keywords
- [ ] Support URL
- [ ] Marketing URL (optional)

**Screenshots Required:**
- 6.7" iPhone (1290×2796) - iPhone 15 Pro Max
- 6.5" iPhone (1284×2778) - iPhone 14 Plus
- 5.5" iPhone (1242×2208) - iPhone 8 Plus

### 5. Submit for Review:

1. Click "Submit for Review"
2. Answer questions:
   - Export compliance
   - Content rights
   - Advertising identifier
3. Submit

---

## ⏱️ Review Timeline

- **Submission:** Instant
- **In Review:** 24-48 hours typically
- **Approved:** Goes live or scheduled release
- **Rejected:** Address feedback and resubmit

---

## 🐛 Common Issues & Solutions

### Issue: "Failed to register bundle identifier"

**Solution:** Bundle ID already taken. Change to unique ID:
```
com.yourcompany.oppositelab
com.oppositelab.app.unique
```

### Issue: "No signing certificate found"

**Solution:**
1. Xcode → Settings → Accounts
2. Select team → "Manage Certificates"
3. "+" → "Apple Development" or "Apple Distribution"

### Issue: "Provisioning profile doesn't include signing certificate"

**Solution:**
1. Enable automatic signing
2. Or regenerate provisioning profile on developer portal

### Issue: "Code signing entitlements error"

**Solution:**
1. Check App ID has required capabilities
2. Verify entitlements in Xcode match App ID

### Issue: "Archive fails with build error"

**Solution:**
```bash
# Clean build folder
# Xcode: Product → Clean Build Folder (⌘⇧K)

# Or command line
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### Issue: "This build is invalid"

**Solution:** Check App Store Connect for specific error:
- Missing architecture (arm64)
- Invalid entitlements
- Missing icons
- Privacy permissions not declared

---

## 🧪 Testing Builds

### TestFlight (Beta Testing):

1. **Internal Testing:**
   - Add internal testers (max 100)
   - No review required
   - Instant access

2. **External Testing:**
   - Add external testers (max 10,000)
   - Requires App Store review
   - Public link or email invite

3. **Install TestFlight app:**
   - Download from App Store
   - Accept invite
   - Install beta build

---

## 🔄 Update Workflow

### For each app update:

```bash
# 1. Update version in Xcode
# General → Identity
# - Increment Build number (e.g., 1 → 2)
# - Update Version if needed (e.g., 1.0.0 → 1.0.1)

# 2. Make your code changes

# 3. Build for Capacitor
npm run build:capacitor

# 4. Sync to iOS
npm run cap:sync:ios

# 5. Open in Xcode
npm run cap:open:ios

# 6. Archive and upload
# Product → Archive → Distribute → App Store Connect
```

---

## 📋 Checklist

### Before First Release:
- [ ] Apple Developer account active ($99/year)
- [ ] Xcode installed and configured
- [ ] Apple ID added to Xcode
- [ ] Team selected in Xcode
- [ ] Bundle ID configured
- [ ] Signing certificates created
- [ ] Provisioning profiles active
- [ ] App builds successfully
- [ ] Archive uploads to App Store Connect
- [ ] App created in App Store Connect
- [ ] All required info filled
- [ ] Screenshots prepared
- [ ] Privacy policy published

### Before Each Update:
- [ ] Build number incremented
- [ ] Version updated appropriately
- [ ] Code changes tested
- [ ] Archive built successfully
- [ ] Uploaded to App Store Connect
- [ ] Build processed successfully
- [ ] Added to app version
- [ ] Release notes written

---

## 💡 Tips & Best Practices

1. **Use Automatic Signing:** Less hassle, easier management
2. **Test on Real Devices:** Simulators don't catch everything
3. **Use TestFlight:** Beta test before public release
4. **Increment Build Numbers:** Each upload needs unique build number
5. **Keep Xcode Updated:** Use latest stable version
6. **Archive Regularly:** Don't wait until release day
7. **Screenshots Matter:** First impression for users
8. **Respond to Reviews:** Show you care about users
9. **Monitor Crash Reports:** Fix issues quickly
10. **Plan Updates:** Regular updates show active development

---

## 🎬 Complete Build & Deploy Script

Add to `package.json`:

```json
{
  "scripts": {
    "ios:prep": "npm run build:capacitor && npm run cap:sync:ios",
    "ios:open": "npm run ios:prep && npm run cap:open:ios"
  }
}
```

Usage:
```bash
# Prepare and open in Xcode
npm run ios:open

# Then in Xcode:
# 1. Increment build number
# 2. Product → Archive
# 3. Distribute → App Store Connect
```

---

## 📞 Getting Help

### Apple Resources:
- **Developer Portal:** https://developer.apple.com
- **App Store Connect:** https://appstoreconnect.apple.com
- **Documentation:** https://developer.apple.com/documentation
- **Support:** https://developer.apple.com/support

### Community:
- **Apple Developer Forums:** https://developer.apple.com/forums
- **Stack Overflow:** Tag: ios, xcode, app-store
- **Capacitor Discord:** https://discord.gg/UPYYRhtyzp

---

## ⚠️ Windows Users

Since you're on Windows, you have these options for iOS builds:

### Option 1: Use a Mac
- Borrow/buy a Mac Mini (cheapest option)
- Use MacBook, iMac, or Mac Studio

### Option 2: Cloud Mac
- **MacStadium:** https://www.macstadium.com
- **AWS EC2 Mac:** https://aws.amazon.com/ec2/instance-types/mac/
- **MacinCloud:** https://www.macincloud.com

### Option 3: CI/CD Service
- **GitHub Actions:** Free macOS runners
- **Bitrise:** iOS CI/CD platform
- **App Center:** Microsoft's mobile CI/CD
- **CircleCI:** Has macOS support

### Option 4: Hire Someone
- Find iOS developer on Upwork/Fiverr
- One-time setup and archive
- You handle app store submission

**Recommendation:** If budget allows, buy a refurbished Mac Mini. It's a one-time investment that makes iOS development much easier.

---

## ✅ Success Checklist

You're ready to publish when:

- [ ] Apple Developer account active
- [ ] Xcode configured with signing
- [ ] App builds without errors
- [ ] Archive uploads successfully
- [ ] App created in App Store Connect
- [ ] All required information filled
- [ ] Screenshots prepared
- [ ] Privacy policy URL added
- [ ] Tested on real devices
- [ ] All features work correctly

---

## 🎉 Next Steps

After iOS signing is complete:

1. ✅ iOS signing configured
2. ✅ Android signing configured
3. ➡️ Build production builds (both platforms)
4. ➡️ Test on real devices
5. ➡️ Submit to both stores!

See `FINAL_DEPLOYMENT_GUIDE.md` for the complete submission checklist and `DEPLOYMENT_CHECKLIST.md` for tracking your progress!
