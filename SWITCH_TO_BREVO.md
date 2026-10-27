# Switch to Brevo (Free Alternative to Resend)

## Why Brevo?
- ✅ FREE 300 emails/day
- ✅ Works for ANY email address
- ✅ No verification needed
- ✅ Better free tier than Resend

## Setup Steps:

### 1. Sign Up for Brevo
1. Go to https://www.brevo.com/
2. Click "Sign up free"
3. Fill in details
4. Verify your email

### 2. Get API Key
1. Login to Brevo dashboard
2. Go to Settings (top right)
3. Click "SMTP & API"
4. Click "Create a new API key"
5. Name it: "OppositeLab"
6. Copy the API key

### 3. Update Your Code

Edit: `src/lib/server/email.ts`

Add Brevo support:

```typescript
if (emailProvider === "brevo") {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "api-key": process.env.BREVO_API_KEY ?? "",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] || process.env.EMAIL_FROM || "noreply@yourdomain.com",
        name: process.env.EMAIL_FROM?.match(/(.+)</)?.   [1].trim() || "OppositeLab",
      },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Brevo error: ${JSON.stringify(error)}`);
  }
  return;
}
```

### 4. Update Environment Variables

**Local (.env.local):**
```bash
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_FROM=OppositeLab <noreply@oppositelab.onrender.com>
APP_URL=http://localhost:3000
```

**Render (Production):**
```bash
EMAIL_PROVIDER=brevo
BREVO_API_KEY=your_brevo_api_key_here
EMAIL_FROM=OppositeLab <noreply@oppositelab.onrender.com>
APP_URL=https://oppositelab.onrender.com
```

### 5. Deploy and Test

```bash
# Test locally
npm run dev

# Deploy to Render
git add .
git commit -m "Switch to Brevo for emails"
git push

# Wait for Render to redeploy
```

### 6. Test Forgot Password

1. Go to https://oppositelab.onrender.com/
2. Click "Forgot Password"
3. Enter ANY email (your friend's, anyone's)
4. Email should be sent! ✅

## Benefits:

- ✅ Works for all users immediately
- ✅ No domain verification needed
- ✅ 300 emails/day (more than Resend free)
- ✅ Professional delivery
- ✅ Email analytics in dashboard

## Notes:

- Brevo might show "via brevo.com" in email headers
- To remove this, verify a custom domain (later)
- But emails will work for everyone right away!
