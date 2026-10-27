# 📱 Quick Install on Your Phone

## For Android (Windows - You Can Do This Now!)

### Step 1: Build the App

```powershell
# Navigate to your project
cd c:\Users\hp\Desktop\oppositelab\oppositelab

# Set environment for mobile
$env:CAPACITOR_BUILD = "true"
$env:NEXT_PUBLIC_API_URL = "https://your-deployed-url.vercel.app"

# Build for Capacitor
npm run build:capacitor

# Sync to Android
npm run cap:sync:android

# Open in Android Studio
npm run cap:open:android
```

### Step 2: Build Debug APK in Android Studio

1. **Wait for Gradle sync** (first time takes 5-10 minutes)
2. **Build APK:**
   - Click: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
   - Or press: **Ctrl+Shift+A** and type "Build APK"
3. **Wait for build** (1-3 minutes)
4. **Find APK:** 
   - Look for notification: "APK(s) generated successfully"
   - Click "locate" or find at:
     ```
     android\app\build\outputs\apk\debug\app-debug.apk
     ```

### Step 3: Install on Your Phone

**Method 1: Via USB Cable (Recommended)**

1. **Enable Developer Options on phone:**
   - Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → System → Developer Options
   - Enable "USB Debugging"

2. **Connect phone via USB cable**

3. **Install APK:**
   ```powershell
   # Check device connected
   adb devices
   
   # Install
   adb install android\app\build\outputs\apk\debug\app-debug.apk
   ```

4. **Find app on phone:**
   - Look for "OppositeLab" icon
   - Tap to open!

**Method 2: Transfer APK File**

1. **Copy APK to phone:**
   - USB: Copy `app-debug.apk` to phone's Download folder
   - Email: Send APK to yourself
   - Cloud: Upload to Google Drive, download on phone

2. **Install on phone:**
   - Open "Files" or "Downloads" app
   - Tap `app-debug.apk`
   - Allow "Install from unknown sources" if prompted
   - Tap "Install"

3. **Open app:**
   - App appears in app drawer
   - Tap to open!

---

## For iOS (Requires Mac)

### Step 1: Build the App

```bash
# Navigate to your project
cd /path/to/oppositelab

# Set environment
export CAPACITOR_BUILD=true
export NEXT_PUBLIC_API_URL=https://your-deployed-url.vercel.app

# Build for Capacitor
npm run build:capacitor

# Sync to iOS
npm run cap:sync:ios

# Open in Xcode
npm run cap:open:ios
```

### Step 2: Build in Xcode

1. **Connect iPhone via cable**
2. **Trust computer on iPhone**
3. **Select your iPhone** in Xcode device dropdown
4. **Select Team:**
   - Click "App" in sidebar
   - "Signing & Capabilities" tab
   - Select your team
5. **Build and Run:**
   - Press **⌘R** or click Run button
   - App installs and opens on iPhone!

### Step 3: Trust Developer

First time installing:
1. iPhone shows "Untrusted Developer"
2. Go to: **Settings → General → VPN & Device Management**
3. Tap your Apple ID
4. Tap "Trust"
5. Open app again!

---

## 🐛 Troubleshooting

### Android: "App not installed"

**Solution:**
```powershell
# Uninstall old version first
adb uninstall com.oppositelab.app

# Try again
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Android: "USB debugging not authorized"

**Solution:**
1. Unlock phone
2. Tap "Allow" on phone when USB debugging prompt appears
3. Try `adb devices` again

### Android: "adb not recognized"

**Solution:**
1. Android Studio → Tools → SDK Manager
2. SDK Tools tab
3. Check "Android SDK Platform-Tools"
4. Click Apply
5. Restart terminal

### iOS: "Failed to verify code signature"

**Solution:**
1. Xcode → Settings → Accounts
2. Select your Apple ID
3. Click "Manage Certificates"
4. Click "+" → "Apple Development"
5. Try building again

### App crashes on launch

**Solution:**
1. Check API URL is correct
2. Check environment variables
3. Check Chrome DevTools:
   - Android: chrome://inspect
   - iOS: Safari → Develop → Your Device

---

## ⚡ Quick Commands Reference

### Android:
```powershell
# Build
npm run build:capacitor
npm run cap:sync:android
cd android
./gradlew assembleDebug

# Install
adb install app\build\outputs\apk\debug\app-debug.apk

# Uninstall
adb uninstall com.oppositelab.app

# Check logs
adb logcat | Select-String "Capacitor"
```

### iOS:
```bash
# Build
npm run build:capacitor
npm run cap:sync:ios
npm run cap:open:ios
# Then press ⌘R in Xcode
```

---

## 📝 Important Notes

### This is a DEBUG Build
- ✅ Good for testing
- ✅ No signing required (Android)
- ❌ Not for App Store/Play Store
- ❌ Expires after 7 days (iOS)

### For App Store Distribution:
- See: `FINAL_DEPLOYMENT_GUIDE.md`
- Need signing keys (Android)
- Need distribution certificate (iOS)
- Follow store submission process

### Testing Checklist:
- [ ] App installs successfully
- [ ] App opens without crash
- [ ] Can create account
- [ ] Can log in
- [ ] Can view communities
- [ ] Camera permission works
- [ ] Microphone permission works
- [ ] Video calls work

---

## 🎉 Success!

Once installed, you can:
- Test app on real device
- Share with friends for testing
- Debug with Chrome DevTools
- Prepare for store submission

**Next:** If everything works, follow `FINAL_DEPLOYMENT_GUIDE.md` to publish to stores!
