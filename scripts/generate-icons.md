# App Icon Generation Guide

## Current Icons
- ✅ `oppositelab-180.png` - 180x180 (iPhone)
- ✅ `oppositelab-192.png` - 192x192 (Android)
- ✅ `oppositelab-512.png` - 512x512 (PWA, Android)

## Required Icons

### iOS App Store Icons (Required)
Copy and rename from existing icons or generate new ones:

**From existing `oppositelab-512.png`, create:**

1. **App Icon (1024x1024)** - REQUIRED for App Store
   - File: `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png`
   - Use: App Store listing

2. **iPhone Icons**
   - 20x20 @2x (40x40): `AppIcon-20@2x.png`
   - 20x20 @3x (60x60): `AppIcon-20@3x.png`
   - 29x29 @2x (58x58): `AppIcon-29@2x.png`
   - 29x29 @3x (87x87): `AppIcon-29@3x.png`
   - 40x40 @2x (80x80): `AppIcon-40@2x.png`
   - 40x40 @3x (120x120): `AppIcon-40@3x.png`
   - 60x60 @2x (120x120): `AppIcon-60@2x.png`
   - 60x60 @3x (180x180): `AppIcon-60@3x.png` ✅ Use existing 180.png

3. **iPad Icons** (if supporting iPad)
   - 20x20 @1x (20x20): `AppIcon-20.png`
   - 20x20 @2x (40x40): `AppIcon-20@2x~ipad.png`
   - 29x29 @1x (29x29): `AppIcon-29.png`
   - 29x29 @2x (58x58): `AppIcon-29@2x~ipad.png`
   - 40x40 @1x (40x40): `AppIcon-40.png`
   - 40x40 @2x (80x80): `AppIcon-40@2x~ipad.png`
   - 76x76 @1x (76x76): `AppIcon-76.png`
   - 76x76 @2x (152x152): `AppIcon-76@2x.png`
   - 83.5x83.5 @2x (167x167): `AppIcon-83.5@2x.png`

### Android App Icons (Required)

**From existing `oppositelab-512.png`, create:**

Located in: `android/app/src/main/res/`

1. **mipmap-mdpi/** (48x48)
   - `ic_launcher.png` - 48x48

2. **mipmap-hdpi/** (72x72)
   - `ic_launcher.png` - 72x72

3. **mipmap-xhdpi/** (96x96)
   - `ic_launcher.png` - 96x96

4. **mipmap-xxhdpi/** (144x144)
   - `ic_launcher.png` - 144x144

5. **mipmap-xxxhdpi/** (192x192)
   - `ic_launcher.png` - 192x192 ✅ Use existing 192.png

6. **Play Store Icon** (512x512)
   - Use: `oppositelab-512.png` ✅ Already have this!

## Quick Generation Methods

### Option 1: Online Tool (Easiest)
1. Go to https://www.appicon.co/
2. Upload your `oppositelab-512.png`
3. Select iOS and Android
4. Download and extract

### Option 2: Use ImageMagick (Command Line)
```bash
# Install ImageMagick first
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generate iOS icons
magick public/icons/oppositelab-512.png -resize 1024x1024 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png
magick public/icons/oppositelab-512.png -resize 180x180 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-60@3x.png
magick public/icons/oppositelab-512.png -resize 120x120 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-60@2x.png
magick public/icons/oppositelab-512.png -resize 87x87 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-29@3x.png
magick public/icons/oppositelab-512.png -resize 80x80 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-40@2x.png
magick public/icons/oppositelab-512.png -resize 58x58 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-29@2x.png
magick public/icons/oppositelab-512.png -resize 60x60 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-20@3x.png
magick public/icons/oppositelab-512.png -resize 40x40 ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-20@2x.png

# Generate Android icons
magick public/icons/oppositelab-512.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
magick public/icons/oppositelab-512.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
magick public/icons/oppositelab-512.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
magick public/icons/oppositelab-512.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
magick public/icons/oppositelab-512.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
```

### Option 3: Use Capacitor Assets Generator (Recommended)
```bash
npm install @capacitor/assets --save-dev

# Create icon and splash screen
npx @capacitor/assets generate --iconBackgroundColor '#09090b' --iconBackgroundColorDark '#09090b' --splashBackgroundColor '#09090b' --splashBackgroundColorDark '#09090b'
```

## Splash Screen Setup

### Create splash screen source image
Create a `splash.png` (2732x2732) with your logo centered on a solid background.

**Background color:** `#09090b` (matches your theme)

Place in: `public/splash.png`

Then run:
```bash
npx @capacitor/assets generate
```

This will automatically generate all iOS and Android splash screens!

## Manual Icon Setup (If needed)

If you want to manually place icons:

### iOS Icons Location
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/
├── AppIcon-1024.png (1024x1024)
├── AppIcon-20@2x.png (40x40)
├── AppIcon-20@3x.png (60x60)
├── AppIcon-29@2x.png (58x58)
├── AppIcon-29@3x.png (87x87)
├── AppIcon-40@2x.png (80x80)
├── AppIcon-40@3x.png (120x120)
├── AppIcon-60@2x.png (120x120)
└── AppIcon-60@3x.png (180x180)
```

### Android Icons Location
```
android/app/src/main/res/
├── mipmap-mdpi/ic_launcher.png (48x48)
├── mipmap-hdpi/ic_launcher.png (72x72)
├── mipmap-xhdpi/ic_launcher.png (96x96)
├── mipmap-xxhdpi/ic_launcher.png (144x144)
└── mipmap-xxxhdpi/ic_launcher.png (192x192)
```

## Quick Start Commands

```bash
# Install assets generator
npm install @capacitor/assets --save-dev

# Generate all icons and splash screens automatically
npx @capacitor/assets generate

# Or manually using the 512px icon you already have
# Use appicon.co or ImageMagick as shown above
```

## After Generating Icons

1. **Sync to native projects:**
   ```bash
   npm run cap:sync
   ```

2. **Verify in Xcode (iOS):**
   ```bash
   npm run cap:open:ios
   ```
   - Open App → Assets.xcassets → AppIcon
   - Verify all icon slots are filled

3. **Verify in Android Studio:**
   ```bash
   npm run cap:open:android
   ```
   - Check `res/mipmap-*/ic_launcher.png` files exist

## Notes

- **iOS requires:** 1024x1024 icon for App Store (no transparency)
- **Android requires:** Adaptive icons (foreground + background layers)
- **Splash screens** are configured in `capacitor.config.ts`
- Icons should be **PNG format** with **no transparency** (use solid background)
- Use consistent branding across all icon sizes

## Current Status

✅ Base icons exist (180, 192, 512)
⏳ Need to generate platform-specific icons
⏳ Need to create splash screen
⏳ Need to sync to native projects

## Next Steps

1. Run: `npm install @capacitor/assets --save-dev`
2. Create: `public/splash.png` (2732x2732, centered logo)
3. Run: `npx @capacitor/assets generate`
4. Run: `npm run cap:sync`
5. Verify in native IDEs
