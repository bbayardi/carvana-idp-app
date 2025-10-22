# Email Notification Setup

This guide explains how to set up email notifications for the IDP sharing feature.

## Overview

When a user shares their assessment, the system sends an automated email to the collaborator with a link to provide feedback.

## Prerequisites

1. **Supabase CLI** installed: `npm install -g supabase`
2. **Resend Account**: Sign up at [resend.com](https://resend.com)
3. **Resend API Key**: Get from Resend dashboard

## Step 1: Deploy the Edge Function

From the project root, deploy the edge function to Supabase:

```bash
# Login to Supabase CLI
supabase login

# Link your project (replace with your project reference)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy the edge function
supabase functions deploy send-share-email
```

## Step 2: Set Environment Variables

Set your Resend API key as a secret in Supabase:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

Or via the Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secret: `RESEND_API_KEY` = `re_your_api_key_here`

## Step 3: Configure Email Domain (Production)

### For Development/Testing
The current setup uses `noreply@carvana.com` which will work with Resend's test mode.

### For Production
1. **Verify your domain** in Resend dashboard
2. **Update the edge function** to use your verified domain:
   - Edit `supabase/functions/send-share-email/index.ts`
   - Change: `from: "Carvana IDP Tool <noreply@your-verified-domain.com>"`
3. **Redeploy**: `supabase functions deploy send-share-email`

## Step 4: Test Email Sending

After deployment, test the email functionality:

1. Create a share in the app
2. Check the console for "✅ Share email sent successfully"
3. Check the collaborator's inbox
4. If issues, check Supabase logs: `supabase functions logs send-share-email`

## Troubleshooting

### Email not sending
- Check Supabase function logs
- Verify RESEND_API_KEY is set correctly
- Ensure Resend account is active and has credits

### CORS errors
- Verify the edge function has proper CORS headers
- Check Supabase function URL is accessible

### Email in spam
- Use a verified domain in production
- Configure SPF/DKIM records in Resend

## Email Template

The email includes:
- Clear subject line: "[User] shared their [Role] assessment with you"
- Professional Carvana-branded HTML template
- Direct link to provide feedback
- Note that the link never expires

## Cost Considerations

**Resend Free Tier:**
- 3,000 emails/month free
- $1 per 1,000 emails after that

For a 100-person company with ~10 shares/month per person = 1,000 emails/month (well within free tier).

## Alternative: Supabase Auth Emails

If you prefer to use Supabase's built-in email (not recommended for this use case):
- Supabase Auth emails are designed for authentication only
- Limited customization
- Better to use Resend for transactional emails
