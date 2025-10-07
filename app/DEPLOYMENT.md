# Deployment Guide for Carvana IDP Tool

## Quick Deploy with Vercel (Recommended)

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   npx vercel
   ```

3. **Follow the prompts**:
   - Login to your Vercel account (or create one)
   - Choose default settings (Vercel auto-detects Vite)
   - Get your deployment URL instantly!

4. **Deploy to production**:
   ```bash
   npx vercel --prod
   ```

### Option 2: Deploy via Vercel Website (Easiest)

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub, GitLab, or Bitbucket
3. Click "Add New Project"
4. Import your Git repository or upload the `app` folder
5. Vercel will auto-detect settings
6. Click "Deploy"
7. Get your shareable link in seconds!

## Your Shareable Link

After deployment, you'll get a URL like:
- `https://your-project-name.vercel.app`

You can customize this with:
- A custom domain (e.g., `idp.carvana.com`)
- A better project name in Vercel settings

## Sharing with Your Team

1. **Share the URL** - Anyone with the link can access it
2. **Important Notes**:
   - All data is stored locally in each user's browser (localStorage)
   - Each user's responses are private to their device
   - Users can export their individual CSV files
   - No backend/database needed - completely client-side

## Updating the App

After making changes:

```bash
# Build locally to test
npm run build

# Deploy updates
npx vercel --prod
```

Vercel will give you a preview URL for each deployment before you promote to production.

## Alternative: GitHub Pages

1. Install gh-pages:
   ```bash
   npm i -D gh-pages
   ```

2. Add to package.json scripts:
   ```json
   "deploy": "npm run build && gh-pages -d dist"
   ```

3. Deploy:
   ```bash
   npm run deploy
   ```

Your site will be at: `https://[username].github.io/[repo-name]`

## Troubleshooting

- **Build fails**: Run `npm run build` locally first to check for errors
- **Data not persisting**: Remind users not to clear browser data
- **Excel file missing**: Make sure `data/idp.xlsx` is included in deployment

## Support

If you need help, the configuration files are ready:
- `vercel.json` - Vercel configuration
- `.gitignore` - Excludes unnecessary files
- Build tested and working ✓
