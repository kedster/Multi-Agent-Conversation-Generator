# QUICK REFERENCE: Cloudflare Worker Configuration

## Exact Build Settings for Cloudflare Dashboard

Copy these exact values into your Cloudflare Worker configuration:

### Build Configuration
```
Build command: npm run build:worker
Deploy command: npx wrangler deploy
Non-production branch deploy command: npx wrangler versions upload
Root directory: /
```

### Environment Variables
Set in Cloudflare Dashboard → Workers → Your Worker → Settings → Variables:
```
Name: OPENAI_API_KEY
Value: [Your OpenAI API Key]
Type: Secret
```

### Worker Name
The worker is configured as: `multicahtbackend`

### API Endpoints
After deployment, your endpoints will be:
- Health Check: `GET https://multicahtbackend.your-subdomain.workers.dev/api/health`
- OpenAI Proxy: `POST https://multicahtbackend.your-subdomain.workers.dev/api/openai`

### Files Modified/Created
- ✅ `wrangler.toml` - Updated worker configuration
- ✅ `package.json` - Added worker build scripts
- ✅ `functions/index.ts` - Worker entry point
- ✅ `functions/api/openai-worker.ts` - OpenAI API handler
- ✅ `functions/api/health-worker.ts` - Health check handler

### Verification Commands
```bash
# Test worker build
npm run build:worker

# Test deployment (dry run)
npx wrangler deploy --dry-run

# Deploy to production
npm run deploy:worker
```

All configuration is now ready for successful Cloudflare Worker deployment!