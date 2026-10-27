# 🔐 Android App Signing Guide

## Overview

Android apps must be digitally signed before they can be uploaded to Google Play Store. This guide walks you through creating and configuring your signing key.

---

## 🔑 Step 1: Generate Signing Key

### Using Command Line (Recommended)

Open PowerShell in your project root and run:

```powershell
# Navigate to project root
cd c:\Users\hp\Desktop\oppositelab\oppositelab

# Generate keystore (you'll be prompted for passwords and info)
keytool -genkey -v -keystore oppositelab-release.keystore -alias oppositelab -keyalg RSA -keysize 2048 -validity 10000
```

### You'll be prompted for:

1. **Keystore password:** Choose a strong password (remember this!)
2. **Key password:** Can be same as keystore password or different
3. **First and Last Name:** Your name or company name
4. **Organizational Unit:** Your team/department (e.g., "Development")
5. **Organization:** Your company name (e.g., "OppositeLab")
6. **City/Locality:** Your city
7. **State/Province:** Your state
8. **Country Code:** Two-letter code (e.g., "US")

### Example Output:
```
Generating 2,048 bit RSA key pair and self-signed certificate (SHA256withRSA) 
with a validity of 10,000 days for: CN=Your Name, OU=Dev, O=OppositeLab, L=City, ST=State, C=US
[Storing oppositelab-release.keystore]
```

---

## 🔒 Step 2: Secure Your Keystore

### ⚠️ CRITICAL - DO NOT LOSE THIS FILE!

Your keystore file is **irreplaceable**. If you lose it, you cannot update your app on Play Store. You would need to publish a new app with a different package name.

### Security Steps:

1. **Backup the keystore:**
   ```powershell
   # Copy to secure location
   Copy-Item oppositelab-release.keystore -Destination "C:\Secure\Backups\"
   
   # Or upload to secure cloud storage (encrypted)
   ```

2. **Add to .gitignore:**
   ```bash
   # Already should be in .gitignore, but verify:
   *.keystore
   key.properties
   ```

3. **Never commit to git:**
   ```powershell
   # Check git status
   git status
   # Ensure .keystore files are not listed
   ```

4. **Store passwords securely:**
   - Use a password manager (LastPass, 1Password, Bitwarden)
   - Don't write passwords in code or config files
   - Don't share via email or chat

---

## ⚙️ Step 3: Configure Android Project

### Create `key.properties` File

Create a new file: `android/key.properties`

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=oppositelab
storeFile=../oppositelab-release.keystore
```

**Replace:**
- `YOUR_KEYSTORE_PASSWORD` - The keystore password you chose
- `YOUR_KEY_PASSWORD` - The key password you chose

### Add to .gitignore

Ensure `android/key.properties` is in `.gitignore`:

```bash
# In root .gitignore
android/key.properties
*.keystore
```

---

## 🔧 Step 4: Update build.gradle

Edit: `android/app/build.gradle`

### Add at the top (before `android {`):

```gradle
def keystorePropertiesFile = rootProject.file("key.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...
```

### Add signing config (inside `android {` block):

Find the `android {` block and add:

```gradle
android {
    // ... existing configuration ...
    
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
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🏗️ Step 5: Build Release APK/AAB

### Option A: Build AAB (Android App Bundle - Recommended)

AAB is smaller and optimized by Google Play for each device.

```powershell
# Navigate to android directory
cd android

# Build release AAB
./gradlew bundleRelease

# Output location:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Option B: Build APK (For testing or other stores)

```powershell
# Build release APK
./gradlew assembleRelease

# Output location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Build from root directory:

```powershell
# From project root
cd c:\Users\hp\Desktop\oppositelab\oppositelab

# Build AAB
cd android ; ./gradlew bundleRelease ; cd ..

# Or build APK
cd android ; ./gradlew assembleRelease ; cd ..
```

---

## ✅ Step 6: Verify Signing

### Check if APK/AAB is signed:

```powershell
# For APK
keytool -list -printcert -jarfile android\app\build\outputs\apk\release\app-release.apk

# For AAB
keytool -list -printcert -jarfile android\app\build\outputs\bundle\release\app-release.aab
```

### You should see:
```
Signer #1:

Signature:
    Owner: CN=Your Name, OU=Dev, O=OppositeLab, L=City, ST=State, C=US
    Issuer: CN=Your Name, OU=Dev, O=OppositeLab, L=City, ST=State, C=US
    Serial number: ...
    Valid from: ... until: ...
```

---

## 📦 Complete Build Process

### Full workflow from code to signed APK/AAB:

```powershell
# 1. Navigate to project
cd c:\Users\hp\Desktop\oppositelab\oppositelab

# 2. Build Next.js for Capacitor
npm run build:capacitor

# 3. Sync to Android
npm run cap:sync:android

# 4. Build signed release AAB
cd android
./gradlew bundleRelease
cd ..

# 5. Locate your signed AAB
# File: android/app/build/outputs/bundle/release/app-release.aab
```

### Using npm scripts (easier):

Add to `package.json`:

```json
{
  "scripts": {
    "android:build": "npm run build:capacitor && npm run cap:sync:android && cd android && ./gradlew bundleRelease",
    "android:apk": "npm run build:capacitor && npm run cap:sync:android && cd android && ./gradlew assembleRelease"
  }
}
```

Then simply run:
```powershell
npm run android:build
```

---

## 🐛 Troubleshooting

### Error: "Keystore file not found"

**Solution:**
```powershell
# Verify file exists
Test-Path oppositelab-release.keystore

# Check path in key.properties
Get-Content android\key.properties
```

### Error: "Invalid keystore format"

**Solution:** Regenerate keystore with correct command.

### Error: "Incorrect password"

**Solution:** Double-check passwords in `key.properties`.

### Build fails with "signing config" error

**Solution:**
1. Verify `key.properties` exists
2. Check syntax in `build.gradle`
3. Ensure keystore file path is correct

### Can't find output AAB/APK

**Solution:**
```powershell
# List all build outputs
Get-ChildItem -Path android\app\build\outputs -Recurse -Include *.aab,*.apk
```

---

## 📊 Version Management

### Update app version before each release:

Edit: `android/app/build.gradle`

```gradle
android {
    defaultConfig {
        applicationId "com.oppositelab.app"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1          // Increment for each release (1, 2, 3, ...)
        versionName "1.0.0"    // User-visible version (1.0.0, 1.0.1, 1.1.0, ...)
    }
}
```

**Rules:**
- `versionCode` must increase with each release (integer)
- `versionName` is shown to users (string, e.g., "1.0.0")
- Play Store won't accept an AAB with same or lower versionCode

### Version Strategy:

| Release Type | versionName | versionCode |
|--------------|-------------|-------------|
| First release | 1.0.0 | 1 |
| Bug fix | 1.0.1 | 2 |
| Minor update | 1.1.0 | 3 |
| Major update | 2.0.0 | 4 |

---

## 🚀 Upload to Google Play Store

### 1. Create App in Play Console

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in details:
   - App name: **OppositeLab**
   - Default language: **English (US)**
   - App type: **App**
   - Free or Paid: **Free** (or choose Paid)

### 2. Upload AAB

1. In Play Console → Your App → Release → Production
2. Click "Create new release"
3. Upload `app-release.aab`
4. Add release notes
5. Review and release

### 3. Required Store Information

Before you can publish, you need:

- [ ] App name and description
- [ ] Screenshots (at least 2)
- [ ] Feature graphic (1024x500)
- [ ] High-res icon (512x512)
- [ ] Content rating questionnaire
- [ ] Privacy policy URL
- [ ] App category
- [ ] Contact details

---

## 🔄 Update Workflow

### For each app update:

```powershell
# 1. Update version in build.gradle
# android/app/build.gradle
# - Increment versionCode (e.g., 1 → 2)
# - Update versionName (e.g., "1.0.0" → "1.0.1")

# 2. Make your code changes

# 3. Build and deploy
npm run build:capacitor
npm run cap:sync:android
cd android
./gradlew bundleRelease

# 4. Upload new AAB to Play Console
# File: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📋 Checklist

### Before First Release:
- [ ] Keystore generated and backed up securely
- [ ] `key.properties` created (not in git)
- [ ] `build.gradle` configured with signing config
- [ ] AAB builds successfully
- [ ] AAB is properly signed (verified with keytool)
- [ ] versionCode and versionName set correctly
- [ ] Tested on real Android device
- [ ] All permissions work correctly

### Before Each Update:
- [ ] versionCode incremented
- [ ] versionName updated appropriately
- [ ] Code changes tested
- [ ] New AAB built
- [ ] Signed and verified

---

## 📝 Important Notes

1. **Backup Your Keystore:** You cannot update your app without it
2. **Never share keystore:** It's like your app's password
3. **Use AAB for Play Store:** Smaller app size, automatic optimization
4. **Test signed builds:** Sometimes issues only appear in release builds
5. **Keep passwords secure:** Use a password manager

---

## 🆘 Emergency: Lost Keystore?

If you lost your keystore:

1. **Cannot update existing app** - You're locked out
2. **Options:**
   - Contact Google Play support (rarely helps)
   - Publish as a new app (new package name)
   - Lose all existing users and ratings

**Prevention is key:** Back up your keystore NOW!

---

## ✅ Success Checklist

You're ready to publish when:

- [x] Keystore generated and secured
- [x] Signing configured in build.gradle
- [x] AAB builds without errors
- [x] AAB is properly signed
- [ ] Version numbers are correct
- [ ] Tested on real device
- [ ] All features work in release build

---

## 🎉 Next Steps

After Android signing is complete:

1. ✅ Android signing configured
2. ➡️ Create iOS signing certificates
3. ➡️ Build production builds
4. ➡️ Test on real devices
5. ➡️ Submit to Google Play Store!

See `iOS_SIGNING_GUIDE.md` for iOS setup and `DEPLOYMENT_CHECKLIST.md` for the complete submission process!
