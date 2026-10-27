# Using Gmail SMTP (Alternative to Resend)

If Resend free tier is limiting you, you can use Gmail SMTP temporarily:

## Step 1: Get Gmail App Password

1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Create app password for "Mail"
5. Copy the 16-character password

## Step 2: Update Environment Variables on Render

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password (16 characters)
EMAIL_FROM=OppositeLab <your-email@gmail.com>
APP_URL=https://oppositelab.onrender.com
```

## Step 3: Update Email Code

However, your current code doesn't support SMTP. You'd need to:
1. Stick with Resend and add custom domain
2. Or add verified emails
3. Or upgrade Resend

**Recommendation:** Add your friend's email to Resend verified emails for now!
