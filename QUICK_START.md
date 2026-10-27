# 🚀 Quick Start - PWA + Capacitor

## Installation (One-Time Setup)

```bash
# 1. Install dependencies
npm install cross-env --save-dev
.\setup-capacitor.ps1

# 2. Initialize Capacitor
npm run cap:init

# 3. Add platforms
npm run cap:add:ios
npm run cap:add:android
```

## Development

```bash
# Test PWA locally
npm run dev
# Open http://localhost:3000
```

## Building

```bash
# For web (with API routes)
npm run build:web

# For mobile apps (static export)
npm run build:capacitor
```

## Mobile Development

```bash
# iOS: Build → Sync → Open Xcode
npm run mobile:ios

# Android: Build → Sync → Open Android Studio
npm run mobile:android

# Or step by step:
npm run build:capacitor    # Build static site
npm run cap:sync          # Sync to native projects
npm run cap:open:ios      # Open Xcode
npm run cap:open:android  # Open Android Studio
```

## Deployment Checklist

### PWA (Web)
- [ ] Deploy to Vercel/Netlify
- [ ] Test on HTTPS (required)
- [ ] Verify manifest loads
- [ ] Test install prompt

### iOS App Store
- [ ] Configure Bundle ID in Xcode
- [ ] Add app icons (all sizes)
- [ ] Set up signing & capabilities
- [ ] Build archive: Product → Archive
- [ ] Upload to App Store Connect
- [ ] Submit for review

### Google Play Store
- [ ] Generate signing key
- [ ] Configure signing in build.gradle
- [ ] Add app icons (all densities)
- [ ] Build AAB: `./gradlew bundleRelease`
- [ ] Upload to Play Console
- [ ] Submit for review

## Key Files

- `public/manifest.json` - PWA configuration
- `public/sw.js` - Service worker
- `capacitor.config.ts` - Capacitor settings
- `PWA_CAPACITOR_GUIDE.md` - Full documentation
- `CAPACITOR_IMPORTANT.md` - API routes info

## Important

⚠️ **Mobile apps use static export** - They cannot use Next.js API routes.
Deploy your web app first, then point mobile apps to it via `NEXT_PUBLIC_API_URL`.

See `PWA_CAPACITOR_GUIDE.md` for complete details.
