# Important Notes for Capacitor Build

## API Routes Limitation

⚠️ **Critical:** Next.js static export (`output: 'export'`) does NOT support API routes.

Your app has API routes in `src/app/api/`. These will NOT work in the Capacitor mobile apps.

### Solutions:

#### Option 1: Use External API (Recommended for Production)
Deploy your API routes separately:
- Deploy Next.js API routes to Vercel/Netlify/your server
- Update mobile app to call external API URL
- Use environment variables to switch between local/production API

```typescript
// Example: src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.oppositelab.com';

export async function fetchUser() {
  const response = await fetch(`${API_BASE}/api/user`);
  return response.json();
}
```

#### Option 2: Hybrid Build (Development)
Keep two build configurations:
- Web build: Normal Next.js (with API routes)
- Mobile build: Static export (API calls go to deployed backend)

#### Option 3: Move Logic to Client
For simple operations, move logic to client-side:
- Use MongoDB Atlas Data API
- Use Firebase/Supabase client SDKs
- Direct database connections (not recommended for production)

### Recommended Approach for OppositeLab:

1. **Keep web version as-is** (with API routes)
2. **For mobile (Capacitor):**
   - Set `NEXT_PUBLIC_API_URL=https://your-deployed-api.vercel.app`
   - Build with `CAPACITOR_BUILD=true npm run build`
   - All API calls go to your deployed backend

### Environment Variables

Create `.env.production.local` for Capacitor builds:
```bash
CAPACITOR_BUILD=true
NEXT_PUBLIC_API_URL=https://oppositelab.vercel.app
```

This way:
- Web app: Uses internal API routes
- Mobile app: Calls deployed web API
