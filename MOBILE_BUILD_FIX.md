# 🔧 Mobile Build Fix - API Routes Issue

## Problem

Your app has API routes in `src/app/api/` that cannot be statically exported for mobile apps.

## Solution Options

### ✅ Option 1: Use Deployed Web App (RECOMMENDED)

Your web app is deployed, so mobile app can call it as backend:

1. **Update `.env.production.local`:**
   ```bash
   CAPACITOR_BUILD=true
   NEXT_PUBLIC_API_URL=https://your-actual-deployed-url.vercel.app
   
   # Add your other env vars too:
   MONGODB_URI=your_mongodb_uri
   LIVEKIT_API_KEY=your_key
   LIVEKIT_API_SECRET=your_secret
   LIVEKIT_URL=wss://your-project.livekit.cloud
   ```

2. **Build:**
   ```powershell
   npm run build:capacitor
   ```

3. **Update your API calls in code** to use `NEXT_PUBLIC_API_URL`:
   ```typescript
   // Instead of:
   fetch('/api/admin/communities')
   
   // Use:
   const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
   fetch(`${API_URL}/api/admin/communities`)
   ```

### ⚡ Option 2: Quick Test Build (Skip API Routes)

For quick testing without API functionality:

1. **Temporarily move API routes:**
   ```powershell
   # Rename api folder
   Rename-Item src\app\api src\app\api_backup
   ```

2. **Build:**
   ```powershell
   npm run build:capacitor
   npm run cap:sync:android
   ```

3. **Test app** (API features won't work, but you can see the UI)

4. **Restore API routes:**
   ```powershell
   Rename-Item src\app\api_backup src\app\api
   ```

### 🎯 Option 3: Create API Client (BEST Long-term)

Create a centralized API client that handles both environments:

**File: `src/lib/api-client.ts`**
```typescript
// API base URL - deployed web app for mobile, local for web
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export async function apiRequest(endpoint: string, options?: RequestInit) {
  const url = API_BASE ? `${API_BASE}${endpoint}` : endpoint;
  const response = await fetch(url, options);
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }
  
  return response.json();
}

// Example usage
export async function getCommunities() {
  return apiRequest('/api/admin/communities');
}

export async function getAuditLog() {
  return apiRequest('/api/admin/audit-log');
}
```

**Update components to use API client:**
```typescript
import { getCommunities } from '@/lib/api-client';

// Instead of:
const res = await fetch('/api/admin/communities');

// Use:
const data = await getCommunities();
```

## Quick Start (Recommended Path)

### If You Have Your Web App Deployed:

```powershell
# 1. Edit .env.production.local with your deployed URL
notepad .env.production.local

# 2. Build
npm run build:capacitor

# 3. Sync
npm run cap:sync:android

# 4. Open in Android Studio
npm run cap:open:android

# 5. Build APK in Android Studio
```

### If You Don't Have Deployed URL Yet:

**Option A: Deploy web app first (20 min):**
```powershell
# Deploy to Vercel
vercel --prod

# Note the URL, add to .env.production.local
# Then build mobile app
```

**Option B: Quick test without API (5 min):**
```powershell
# Temporarily hide API routes
Rename-Item src\app\api src\app\api_backup

# Build
npm run build:capacitor
npm run cap:sync:android

# Open and build APK
npm run cap:open:android

# Restore API routes later
Rename-Item src\app\api_backup src\app\api
```

## What's Your Deployed URL?

Tell me your deployed web app URL, and I'll help you configure it properly!

Example URLs:
- `https://oppositelab.vercel.app`
- `https://oppositelab.netlify.app`
- `https://your-custom-domain.com`

Once configured, your mobile app will call your deployed backend for all API requests!
