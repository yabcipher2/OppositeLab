# 📱 App Icon Setup Instructions

## ✅ What You Already Have

Your project already has these base icons in `/public/icons/`:
- `oppositelab-180.png` - 180x180px (Perfect for iPhone)
- `oppositelab-192.png` - 192x192px (Perfect for Android)
- `oppositelab-512.png` - 512x512px (Perfect for Play Store & PWA)

## 🎯 Quick Setup - Use Online Tool (RECOMMENDED)

This is the **fastest and easiest** method:

### Step 1: Generate All Icons Online

1. **Go to:** https://www.appicon.co/
2. **Upload:** `public/icons/oppositelab-512.png`
3. **Select platforms:**
   - ✅ iOS (iPhone/iPad)
   - ✅ Android
4. **Click "Generate"**
5. **Download** the zip files

### Step 2: Extract and Copy Files

#### For iOS:
1. Extract the iOS zip
2. Copy all PNG files to:
   ```
   ios/App/App/Assets.xcassets/AppIcon.appiconset/
   ```
3. Copy the `Contents.json` file too

#### For Android:
1. Extract the Android zip
2. You'll see folders like: `mipmap-mdpi`, `mipmap-hdpi`, etc.
3. Copy ALL mipmap folders into:
   ```
   android/app/src/main/res/
   ```
   (Replace existing folders)

### Step 3: Sync to Native Projects
```bash
npm run cap:sync
```

### Step 4: Verify

**iOS (if you have macOS):**
```bash
npm run cap:open:ios
```
- In Xcode, click on "App" in left sidebar
- Click "Assets.xcassets" → "AppIcon"
- All slots should be filled with icons

**Android:**
```bash
npm run cap:open:android
```
- Look at `app/src/main/res/mipmap-*` folders
- Each should have `ic_launcher.png`

---

## 🛠️ Alternative: Manual Icon Generation (If you can't use online tools)

### Required Icon Sizes

#### iOS Icons Needed:
All go in: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

| Size | Filename | Purpose |
|------|----------|---------|
| 1024x1024 | AppIcon-1024.png | App Store |
| 180x180 | AppIcon-60@3x.png | iPhone |
| 120x120 | AppIcon-60@2x.png | iPhone |
| 120x120 | AppIcon-40@3x.png | Spotlight |
| 87x87 | AppIcon-29@3x.png | Settings |
| 80x80 | AppIcon-40@2x.png | Spotlight |
| 60x60 | AppIcon-20@3x.png | Notifications |
| 58x58 | AppIcon-29@2x.png | Settings |
| 40x40 | AppIcon-20@2x.png | Notifications |

#### Android Icons Needed:
All named `ic_launcher.png` in respective folders:

| Folder | Size | 
|--------|------|
| mipmap-mdpi | 48x48 |
| mipmap-hdpi | 72x72 |
| mipmap-xhdpi | 96x96 |
| mipmap-xxhdpi | 144x144 |
| mipmap-xxxhdpi | 192x192 |

### Using Free Software to Resize

**Option 1: GIMP (Free)**
1. Download GIMP: https://www.gimp.org/
2. Open `oppositelab-512.png`
3. Image → Scale Image
4. Enter target size (e.g., 1024x1024)
5. Quality: Cubic (better quality)
6. Export as PNG

**Option 2: Paint.NET (Windows, Free)**
1. Download: https://www.getpaint.net/
2. Open `oppositelab-512.png`
3. Image → Resize
4. Enter target size
5. Maintain aspect ratio
6. Save as PNG

**Option 3: Online Resizer**
1. Go to: https://www.iloveimg.com/resize-image
2. Upload `oppositelab-512.png`
3. Enter dimensions
4. Download resized image

---

## 📋 iOS Contents.json File

After adding icons to iOS, you need a `Contents.json` file.

Create: `ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`

```json
{
  "images": [
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "AppIcon-20@2x.png",
      "scale": "2x"
    },
    {
      "size": "20x20",
      "idiom": "iphone",
      "filename": "AppIcon-20@3x.png",
      "scale": "3x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "AppIcon-29@2x.png",
      "scale": "2x"
    },
    {
      "size": "29x29",
      "idiom": "iphone",
      "filename": "AppIcon-29@3x.png",
      "scale": "3x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "AppIcon-40@2x.png",
      "scale": "2x"
    },
    {
      "size": "40x40",
      "idiom": "iphone",
      "filename": "AppIcon-40@3x.png",
      "scale": "3x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "AppIcon-60@2x.png",
      "scale": "2x"
    },
    {
      "size": "60x60",
      "idiom": "iphone",
      "filename": "AppIcon-60@3x.png",
      "scale": "3x"
    },
    {
      "size": "1024x1024",
      "idiom": "ios-marketing",
      "filename": "AppIcon-1024.png",
      "scale": "1x"
    }
  ],
  "info": {
    "version": 1,
    "author": "xcode"
  }
}
```

---

## 🎨 Splash Screen Setup

### Create Source Splash Screen

1. **Create a 2732x2732px image** with:
   - Background color: `#09090b` (your app's dark theme)
   - Your logo centered
   - Leave plenty of padding (safe area)

2. **Save as:** `resources/splash.png` (create `resources` folder if needed)

3. **Generate splash screens:**
   ```bash
   npx @capacitor/assets generate --splash resources/splash.png
   ```

### Or Manual Splash Screen

Your splash screen is already configured in `capacitor.config.ts`:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#09090b',
    showSpinner: false,
  },
},
```

This gives you a simple dark splash screen. To add a logo:

1. Add splash images to native projects manually
2. Or use Capacitor Assets generator (recommended)

---

## ✅ Verification Checklist

### iOS:
- [ ] Open Xcode: `npm run cap:open:ios`
- [ ] Navigate to: App → Assets.xcassets → AppIcon
- [ ] Verify: All 9 icon slots filled (no warnings)
- [ ] Test: Build and run on simulator
- [ ] Check: Icon appears on home screen

### Android:
- [ ] Open Android Studio: `npm run cap:open:android`
- [ ] Navigate to: app/src/main/res/
- [ ] Verify: All 5 mipmap folders have `ic_launcher.png`
- [ ] Test: Build and run on emulator
- [ ] Check: Icon appears in app drawer

### After Verification:
```bash
# Build app
npm run build:capacitor

# Sync to platforms
npm run cap:sync

# Open in IDEs to verify
npm run cap:open:ios      # macOS only
npm run cap:open:android  # Any OS with Android Studio
```

---

## 🚨 Common Issues

### iOS: "The app icon set named 'AppIcon' has missing images"
**Solution:** Make sure all required PNG files are in the folder AND `Contents.json` references them correctly.

### Android: "Error: Default icon not found"
**Solution:** Make sure `ic_launcher.png` exists in all 5 mipmap folders.

### Icons appear blurry
**Solution:** Ensure you're resizing from the highest quality source (512px) and using proper interpolation (cubic/bicubic).

### Transparent backgrounds on iOS
**Solution:** iOS doesn't allow transparent app icons. Fill with a solid color (use `#09090b` for consistency).

---

## 📞 Need Help?

1. **AppIcon.co** - Easiest method, handles everything
2. **Capacitor Assets** - Automated CLI tool
3. **Manual Resize** - Use GIMP, Paint.NET, or online tools

**Recommendation:** Start with AppIcon.co - it's free, fast, and generates everything correctly!

---

## 🎉 Next Steps After Icons Are Set

1. ✅ Icons configured
2. ➡️ Configure permissions (camera, microphone)
3. ➡️ Set up signing (Android keystore, iOS certificates)
4. ➡️ Build for production
5. ➡️ Submit to stores!

See `DEPLOYMENT_CHECKLIST.md` for complete deployment steps.
