# 🔐 App Permissions Guide

## ✅ Permissions Configured

Your OppositeLab app now has the necessary permissions configured for both iOS and Android platforms.

## 📱 iOS Permissions (Info.plist)

**File:** `ios/App/App/Info.plist`

### Configured Permissions:

1. **Camera Access** (`NSCameraUsageDescription`)
   - **Why:** Required for video calls and meetings
   - **User sees:** "OppositeLab needs access to your camera for video calls and meetings."

2. **Microphone Access** (`NSMicrophoneUsageDescription`)
   - **Why:** Required for video calls and meetings
   - **User sees:** "OppositeLab needs access to your microphone for video calls and meetings."

3. **Photo Library Access** (`NSPhotoLibraryUsageDescription`)
   - **Why:** To allow users to share images during conversations
   - **User sees:** "OppositeLab needs access to your photo library to share images."

4. **Photo Library Add** (`NSPhotoLibraryAddUsageDescription`)
   - **Why:** To save images from conversations
   - **User sees:** "OppositeLab needs access to save images to your photo library."

### How iOS Permissions Work:

- First time a feature is used, iOS shows a popup with your custom message
- User can Allow or Deny
- Permissions can be changed later in Settings → OppositeLab
- App Store review checks that all requested permissions are actually used

---

## 🤖 Android Permissions (AndroidManifest.xml)

**File:** `android/app/src/main/AndroidManifest.xml`

### Configured Permissions:

#### Required Permissions:

1. **INTERNET** ✅
   - Network access for API calls and real-time communication
   - Granted automatically (no user prompt)

2. **CAMERA** ✅
   - Access device camera for video calls
   - Runtime permission (user must approve)

3. **RECORD_AUDIO** ✅
   - Access microphone for audio in video calls
   - Runtime permission (user must approve)

4. **MODIFY_AUDIO_SETTINGS** ✅
   - Adjust volume and audio routing during calls
   - Granted automatically

5. **ACCESS_NETWORK_STATE** ✅
   - Check network connectivity status
   - Granted automatically

#### Storage Permissions (Android 12 and below):

6. **WRITE_EXTERNAL_STORAGE** (maxSdkVersion="32")
   - Write files to shared storage
   - Only needed on Android 12 and below
   - Runtime permission

7. **READ_EXTERNAL_STORAGE** (maxSdkVersion="32")
   - Read files from shared storage
   - Only needed on Android 12 and below
   - Runtime permission

#### Hardware Features (Optional):

- **android.hardware.camera** (required="false")
- **android.hardware.camera.autofocus** (required="false")
- **android.hardware.microphone** (required="false")

These declare hardware features but don't require them, allowing installation on devices without cameras/microphones.

### How Android Permissions Work:

- **Install-time permissions:** Granted automatically (INTERNET, MODIFY_AUDIO_SETTINGS)
- **Runtime permissions:** App must request when needed (CAMERA, RECORD_AUDIO)
- User sees permission dialog first time each is requested
- Permissions can be revoked in Settings → Apps → OppositeLab → Permissions
- Google Play Store shows all permissions to users before install

---

## 🔍 App Store Review Requirements

### iOS App Store:

✅ **What reviewers check:**
- Each permission has a clear, user-friendly description
- App actually uses the permissions it requests
- Permissions are requested only when needed, not on launch
- Privacy policy explains data usage

❌ **Common rejection reasons:**
- Generic or unclear permission descriptions
- Requesting permissions but not using them
- Requesting permissions immediately on app launch
- Missing privacy policy

### Google Play Store:

✅ **What reviewers check:**
- Only necessary permissions are requested
- App functionality matches requested permissions
- Privacy policy explains permissions and data usage
- No unused or excessive permissions

❌ **Common rejection reasons:**
- Requesting sensitive permissions without clear need
- Missing privacy policy
- Permissions not used in the app
- Requesting unnecessary permissions

---

## 🎯 Best Practices Implemented

### 1. **Request Permissions at the Right Time**

❌ **Bad:** Request all permissions on app launch
```typescript
// Don't do this on app start
await requestCameraPermission();
await requestMicrophonePermission();
```

✅ **Good:** Request when user tries to use the feature
```typescript
// Request when user clicks "Start Video Call"
function startVideoCall() {
  // Permission will be requested here, with context
  navigator.mediaDevices.getUserMedia({ video: true, audio: true });
}
```

### 2. **Provide Context Before Requesting**

✅ **Good:** Explain why before showing system dialog
```typescript
// Show your own explanation first
showDialog("To join video calls, we need access to your camera and microphone");

// Then request permission
await requestPermissions();
```

### 3. **Handle Permission Denial Gracefully**

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    video: true, 
    audio: true 
  });
  // Proceed with video call
} catch (error) {
  if (error.name === 'NotAllowedError') {
    // Permission denied
    showMessage("Camera/microphone access denied. You can enable it in settings.");
  }
}
```

### 4. **Respect User Privacy**

- Only request permissions you actually need
- Explain clearly why each permission is needed
- Never store or transmit data without permission
- Provide privacy policy

---

## 🧪 Testing Permissions

### iOS Testing (in Simulator/Device):

1. **First Install:**
   ```bash
   npm run mobile:ios
   ```
   - Join a video call
   - Camera permission dialog appears
   - Microphone permission dialog appears

2. **Test Denial:**
   - Deny permission
   - App should handle gracefully
   - User should see helpful message

3. **Reset Permissions (Simulator):**
   ```bash
   # Reset simulator
   xcrun simctl privacy booted reset all com.oppositelab.app
   ```

4. **Check Settings:**
   - Settings → OppositeLab
   - Verify permissions listed

### Android Testing (in Emulator/Device):

1. **First Install:**
   ```bash
   npm run mobile:android
   ```
   - Join a video call
   - Camera permission dialog appears
   - Microphone permission dialog appears

2. **Test Denial:**
   - Deny permission
   - Try again, see "Don't ask again" option
   - App should guide to settings

3. **Manage Permissions:**
   - Settings → Apps → OppositeLab → Permissions
   - Can toggle each permission
   - Test app behavior with different combinations

4. **Check Manifest:**
   ```bash
   # View all permissions in built APK
   cd android
   ./gradlew assembleDebug
   # Then inspect APK
   ```

---

## 📋 Pre-Submission Checklist

### iOS:
- [ ] All permission descriptions are clear and specific
- [ ] Test on real iPhone (not just simulator)
- [ ] Verify each permission is actually used
- [ ] Check permission dialog appears at appropriate time
- [ ] Test permission denial handling
- [ ] Ensure privacy policy mentions permissions
- [ ] Screenshot permission dialogs for App Store review notes

### Android:
- [ ] Only necessary permissions in AndroidManifest
- [ ] Test on real Android device
- [ ] Verify runtime permissions work (Android 6+)
- [ ] Test permission denial and "Don't ask again"
- [ ] Check permission rationale dialogs
- [ ] Ensure privacy policy covers all permissions
- [ ] Test on different Android versions (6, 8, 10, 12, 13+)

---

## 🔧 Modifying Permissions

### To Add More Permissions:

#### iOS:
Edit `ios/App/App/Info.plist`, add:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Your reason for needing location</string>
```

#### Android:
Edit `android/app/src/main/AndroidManifest.xml`, add:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

### Common Additional Permissions:

| Feature | iOS Key | Android Permission |
|---------|---------|-------------------|
| Location | NSLocationWhenInUseUsageDescription | ACCESS_FINE_LOCATION |
| Bluetooth | NSBluetoothAlwaysUsageDescription | BLUETOOTH_CONNECT |
| Notifications | (Handled by Capacitor) | POST_NOTIFICATIONS |
| Contacts | NSContactsUsageDescription | READ_CONTACTS |
| Calendar | NSCalendarsUsageDescription | READ_CALENDAR |

### After Modifying:

```bash
# Sync changes to native projects
npm run cap:sync

# Rebuild and test
npm run mobile:ios      # iOS
npm run mobile:android  # Android
```

---

## 📱 Privacy Policy Requirements

Both app stores require a privacy policy that explains:

1. **What data is collected**
   - Camera/microphone used for video calls
   - Data not stored on device
   - Video calls use WebRTC (peer-to-peer when possible)

2. **How data is used**
   - Real-time video communication only
   - Not recorded or stored without explicit consent
   - Not shared with third parties

3. **User rights**
   - Users can revoke permissions anytime
   - Users can delete their account
   - How to contact you about privacy

4. **Third-party services**
   - List any analytics services
   - Video infrastructure providers (LiveKit)
   - Any other third-party SDKs

### Where to Add Privacy Policy:

- **iOS:** App Store Connect → App Information → Privacy Policy URL
- **Android:** Google Play Console → Store Listing → Privacy Policy
- **In-app:** Link in Settings or About page

---

## ✅ Current Status

Your app is now configured with:

✅ **iOS Permissions:**
- Camera (NSCameraUsageDescription)
- Microphone (NSMicrophoneUsageDescription)
- Photo Library Read (NSPhotoLibraryUsageDescription)
- Photo Library Write (NSPhotoLibraryAddUsageDescription)

✅ **Android Permissions:**
- CAMERA
- RECORD_AUDIO
- MODIFY_AUDIO_SETTINGS
- ACCESS_NETWORK_STATE
- Storage (Android 12 and below)

✅ **Ready for:**
- Video calling functionality
- Audio communication
- Image sharing
- App store submission

---

## 🆘 Troubleshooting

### iOS: Permission dialog doesn't appear
- Check Info.plist has the permission key
- Clean build: Product → Clean Build Folder
- Delete app and reinstall
- Check Xcode console for errors

### Android: Permission denied immediately
- Check AndroidManifest.xml syntax
- Verify permission is spelled correctly
- Clean project: Build → Clean Project
- Uninstall and reinstall app

### Permission works in dev but not in production
- Ensure production build includes updated files
- Verify you're testing production build, not debug
- Check for code signing issues (iOS)
- Rebuild from scratch

---

## 🎉 Next Steps

Now that permissions are configured:

1. ✅ Permissions set up
2. ➡️ Test video calls with camera/microphone
3. ➡️ Set up app signing (iOS certificates, Android keystore)
4. ➡️ Create production builds
5. ➡️ Submit to app stores

See `DEPLOYMENT_CHECKLIST.md` for the complete deployment workflow!
