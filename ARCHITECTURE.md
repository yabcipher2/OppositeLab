# 🏗️ OppositeLab Architecture - PWA + Capacitor

## Platform Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      OppositeLab App                         │
│                    (Single Codebase)                         │
│                      Next.js 15 + React                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│   Web/PWA    │    │   iOS App    │     │ Android App  │
│              │    │              │     │              │
│   Browser    │    │  App Store   │     │  Play Store  │
│              │    │              │     │              │
│   Next.js    │    │  Capacitor   │     │  Capacitor   │
│   (SSR/SSG)  │    │  + iOS SDK   │     │  + Android   │
│              │    │              │     │     SDK      │
└──────────────┘    └──────────────┘     └──────────────┘
```

## Build Strategies

### Web Build (with API Routes)
```
┌─────────────────────────────────────────────┐
│  npm run build:web                          │
│                                             │
│  ┌───────────────────────────────┐         │
│  │   Next.js Build                │         │
│  │   - Server Components          │         │
│  │   - API Routes (/api/*)        │         │
│  │   - Dynamic Rendering          │         │
│  │   - Image Optimization         │         │
│  └───────────────────────────────┘         │
│                 │                           │
│                 ▼                           │
│  ┌───────────────────────────────┐         │
│  │   Deployed to Vercel/Netlify  │         │
│  │   https://oppositelab.com     │         │
│  └───────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

### Mobile Build (Static Export)
```
┌─────────────────────────────────────────────┐
│  npm run build:capacitor                    │
│  (CAPACITOR_BUILD=true)                     │
│                                             │
│  ┌───────────────────────────────┐         │
│  │   Next.js Static Export        │         │
│  │   - Pre-rendered HTML          │         │
│  │   - No API Routes              │         │
│  │   - No Server Functions        │         │
│  │   - Optimized Assets           │         │
│  └───────────────────────────────┘         │
│                 │                           │
│                 ▼                           │
│  ┌───────────────────────────────┐         │
│  │   /out directory               │         │
│  │   (Static Files)               │         │
│  └───────────────────────────────┘         │
│                 │                           │
│                 ▼                           │
│  ┌───────────────────────────────┐         │
│  │   Capacitor Sync               │         │
│  │   → ios/App/App/public/        │         │
│  │   → android/app/src/main/assets│         │
│  └───────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

## Data Flow

### Web PWA
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  Browser │ ───▶ │ Next.js  │ ───▶ │ MongoDB  │
│          │      │ API      │      │ LiveKit  │
│          │ ◀─── │ Routes   │ ◀─── │ Resend   │
└──────────┘      └──────────┘      └──────────┘
     │
     │ (Service Worker)
     ▼
┌──────────┐
│  Cache   │
│ (Offline)│
└──────────┘
```

### Mobile Apps
```
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Mobile   │      │ Deployed │      │ MongoDB  │
│ WebView  │ ───▶ │ Web API  │ ───▶ │ LiveKit  │
│          │      │ (Vercel) │      │ Resend   │
│          │ ◀─── │          │ ◀─── │          │
└──────────┘      └──────────┘      └──────────┘
     │
     │ (Capacitor Storage)
     ▼
┌──────────┐
│  Local   │
│ Storage  │
└──────────┘
```

## Component Structure

```
src/
├── app/                           # Next.js App Router
│   ├── layout.tsx                # Root layout (PWA manifest)
│   ├── page.tsx                  # Home page
│   ├── api/                      # API routes (web only)
│   │   └── */route.ts           
│   └── [feature]/                # Feature pages
│
├── components/
│   ├── PWAInstaller.tsx          # Install prompt (PWA)
│   └── [others]/                 # Shared components
│
├── contexts/                     # React contexts
│   ├── AuthContext.tsx
│   └── ThemeContext.tsx
│
└── styles/
    └── tailwind.css

public/
├── manifest.json                 # PWA manifest
├── sw.js                        # Service worker
└── icons/                       # App icons

capacitor.config.ts              # Capacitor config
next.config.mjs                  # Next.js config
```

## PWA Features

### Service Worker Caching Strategy
```
Request
   │
   ▼
Network First
   │
   ├─ Success ──▶ Cache + Return
   │
   └─ Fail ────▶ Check Cache
                    │
                    ├─ Found ──▶ Return Cached
                    │
                    └─ Not Found ──▶ Offline Page
```

### Install Flow
```
User visits site
   │
   ▼
beforeinstallprompt event fires
   │
   ▼
PWAInstaller component shows banner
   │
   ├─ User clicks "Install"
   │    │
   │    ▼
   │  Show native install prompt
   │    │
   │    ▼
   │  App installed to home screen
   │
   └─ User clicks "Not now"
        │
        ▼
      Banner dismissed
```

## Capacitor Bridge

### How Capacitor Works
```
┌─────────────────────────────────────┐
│     Your React/Next.js App          │
│        (JavaScript/HTML/CSS)        │
└─────────────────────────────────────┘
                  │
                  │ Capacitor Bridge
                  ▼
┌─────────────────────────────────────┐
│        Native WebView               │
│  iOS: WKWebView                     │
│  Android: WebView                   │
└─────────────────────────────────────┘
                  │
                  │ Native Plugins
                  ▼
┌─────────────────────────────────────┐
│     Native Device Features          │
│  - Camera                           │
│  - File System                      │
│  - Push Notifications               │
│  - Geolocation                      │
│  - etc.                             │
└─────────────────────────────────────┘
```

## Deployment Workflow

### Development
```
Code Changes
   │
   ▼
npm run dev (local testing)
   │
   ▼
Test in browser
   │
   ▼
Commit to git
```

### Web Deployment
```
Push to GitHub
   │
   ▼
Vercel Auto-Deploy
   │
   ▼
https://oppositelab.vercel.app
   │
   ▼
PWA updates automatically
```

### Mobile Deployment
```
npm run build:capacitor
   │
   ▼
npm run cap:sync
   │
   ├─ iOS ──▶ Open Xcode ──▶ Archive ──▶ Upload ──▶ App Store
   │
   └─ Android ──▶ Android Studio ──▶ Build AAB ──▶ Upload ──▶ Play Store
```

## Environment Strategy

```
┌──────────────────────────────────────────────┐
│ Development (.env.local)                     │
│ - Local API                                  │
│ - Dev Database                               │
│ - Test Keys                                  │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Web Production (.env.production)             │
│ - Next.js API Routes (internal)              │
│ - Production Database                        │
│ - Production Keys                            │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ Mobile Production (.env.production.local)    │
│ - CAPACITOR_BUILD=true                       │
│ - NEXT_PUBLIC_API_URL=https://deployed.com   │
│ - Production Database                        │
│ - Production Keys                            │
└──────────────────────────────────────────────┘
```

## Security Considerations

```
┌─────────────────────────────────────┐
│  Web (Server-Side)                  │
│  ✓ API Routes protected             │
│  ✓ Environment vars hidden          │
│  ✓ Server-side validation           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  Mobile (Client-Side)               │
│  ⚠ All code visible                 │
│  ⚠ Only use NEXT_PUBLIC_* vars      │
│  ⚠ Validate on server (API)         │
│  ✓ HTTPS enforced                   │
└─────────────────────────────────────┘
```

## Tech Stack Summary

```
┌─────────────────────────────────────────┐
│           Frontend                      │
│  - Next.js 15 (App Router)              │
│  - React 19                             │
│  - TypeScript                           │
│  - Tailwind CSS                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Mobile                        │
│  - Capacitor (iOS + Android)            │
│  - Native WebView                       │
│  - Native Plugins                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           PWA                           │
│  - Service Worker                       │
│  - Web App Manifest                     │
│  - Cache API                            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│           Backend                       │
│  - MongoDB (Database)                   │
│  - LiveKit (Video)                      │
│  - Resend (Email)                       │
│  - Next.js API Routes                   │
└─────────────────────────────────────────┘
```

## Cross-Platform Compatibility

| Feature              | Web PWA | iOS App | Android App |
|---------------------|---------|---------|-------------|
| UI/UX               | ✅      | ✅      | ✅          |
| Offline Mode        | ✅      | ✅      | ✅          |
| Push Notifications  | ✅      | ✅ *    | ✅ *        |
| Camera Access       | ✅      | ✅      | ✅          |
| File System         | Limited | ✅      | ✅          |
| Background Sync     | ✅      | ✅ *    | ✅ *        |
| Install to Home     | ✅      | ✅      | ✅          |
| App Store           | ❌      | ✅      | ✅          |

\* Requires additional Capacitor plugins

---

This architecture gives you **one codebase** that runs everywhere, just like Telegram! 🚀
