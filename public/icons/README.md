# PWA Icons

This directory contains icons for the Progressive Web App (PWA) and mobile apps.

## Current Icons
- `oppositelab-180.png` - 180x180px (Apple Touch Icon)
- `oppositelab-192.png` - 192x192px (Android Chrome, PWA)
- `oppositelab-512.png` - 512x512px (High-res PWA, Splash screens)

## Generating Additional Icons

If you need to create icons from your source SVG (`/public/pwa-icon.svg` or `/public/favicon.svg`):

### Using Online Tools:
1. **PWA Asset Generator**: https://www.pwabuilder.com/imageGenerator
2. **RealFaviconGenerator**: https://realfavicongenerator.net/

### Using CLI Tools:
```bash
# Install pwa-asset-generator globally
npm install -g pwa-asset-generator

# Generate all icon sizes from SVG
pwa-asset-generator public/pwa-icon.svg public/icons --icon-only --background "#09090b"
```

### Recommended Additional Sizes (Optional):
- 72x72, 96x96, 128x128, 144x144, 152x152, 384x384
- Apple-specific: 120x120, 167x167

The existing icons (180, 192, 512) are sufficient for basic PWA functionality.
